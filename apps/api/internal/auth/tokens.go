package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Claims struct {
	Sub string `json:"sub"`
	Typ string `json:"typ"`
	Exp int64  `json:"exp"`
}

type SessionUser struct {
	Username   string `json:"username"`
	AuthMethod string `json:"authMethod"`
}

type Manager struct {
	sessionSecret []byte
	tokenSecret   []byte
	adminUser     string
	adminPass     string
}

type contextKey string

const userContextKey contextKey = "session-user"

func NewManager(sessionSecret, tokenSecret, adminUser, adminPass string) *Manager {
	return &Manager{
		sessionSecret: []byte(sessionSecret),
		tokenSecret:   []byte(tokenSecret),
		adminUser:     adminUser,
		adminPass:     adminPass,
	}
}

func (m *Manager) CheckCredentials(username, password string) bool {
	if subtle.ConstantTimeCompare([]byte(username), []byte(m.adminUser)) != 1 {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(password), []byte(m.adminPass)) == 1
}

func (m *Manager) IssueSession(username string, ttl time.Duration) (string, error) {
	return signToken(m.sessionSecret, Claims{Sub: username, Typ: "session", Exp: time.Now().Add(ttl).Unix()})
}

func (m *Manager) VerifySession(token string) (Claims, error) {
	return verifyToken(m.sessionSecret, token, "session")
}

func (m *Manager) IssueAccessToken(username string, ttl time.Duration) (string, error) {
	return signToken(m.tokenSecret, Claims{Sub: username, Typ: "access", Exp: time.Now().Add(ttl).Unix()})
}

func (m *Manager) IssueRefreshToken(username string, ttl time.Duration) (string, error) {
	return signToken(m.tokenSecret, Claims{Sub: username, Typ: "refresh", Exp: time.Now().Add(ttl).Unix()})
}

func (m *Manager) VerifyAccessToken(token string) (Claims, error) {
	return verifyToken(m.tokenSecret, token, "access")
}

func (m *Manager) VerifyRefreshToken(token string) (Claims, error) {
	return verifyToken(m.tokenSecret, token, "refresh")
}

func signToken(secret []byte, claims Claims) (string, error) {
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	payloadEnc := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, secret)
	if _, err := mac.Write([]byte(payloadEnc)); err != nil {
		return "", err
	}
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return payloadEnc + "." + sig, nil
}

func verifyToken(secret []byte, token, expectedType string) (Claims, error) {
	var claims Claims
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return claims, errors.New("invalid token format")
	}
	mac := hmac.New(sha256.New, secret)
	if _, err := mac.Write([]byte(parts[0])); err != nil {
		return claims, err
	}
	expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if subtle.ConstantTimeCompare([]byte(parts[1]), []byte(expectedSig)) != 1 {
		return claims, errors.New("invalid token signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return claims, err
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return claims, err
	}
	if claims.Typ != expectedType {
		return claims, fmt.Errorf("unexpected token type %s", claims.Typ)
	}
	if time.Now().Unix() >= claims.Exp {
		return claims, errors.New("token expired")
	}
	return claims, nil
}

func WithUser(ctx context.Context, user SessionUser) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

func UserFromContext(ctx context.Context) (SessionUser, bool) {
	user, ok := ctx.Value(userContextKey).(SessionUser)
	return user, ok
}

func BearerToken(r *http.Request) string {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
