package auth

import (
	"context"
	"crypto"
	"crypto/hmac"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
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
	appPublicKey  *rsa.PublicKey
	adminUser     string
	adminPassHash string
}

type contextKey string

const userContextKey contextKey = "session-user"

func NewManager(sessionSecret string, appPublicKey *rsa.PublicKey, adminUser, adminPassHash string) *Manager {
	return &Manager{
		sessionSecret: []byte(sessionSecret),
		appPublicKey:  appPublicKey,
		adminUser:     adminUser,
		adminPassHash: adminPassHash,
	}
}

func (m *Manager) CheckCredentials(username, password string) bool {
	if subtle.ConstantTimeCompare([]byte(username), []byte(m.adminUser)) != 1 {
		return false
	}
	passwordFile, err := os.CreateTemp("", "pan-htpasswd-*")
	if err != nil {
		return false
	}
	passwordFilePath := passwordFile.Name()
	defer func() {
		_ = passwordFile.Close()
		_ = os.Remove(passwordFilePath)
	}()

	if _, err := passwordFile.WriteString(m.adminUser + ":" + m.adminPassHash + "\n"); err != nil {
		return false
	}
	if err := passwordFile.Close(); err != nil {
		return false
	}

	cmd := exec.Command("htpasswd", "-vi", passwordFilePath, m.adminUser)
	cmd.Stdin = strings.NewReader(password)
	return cmd.Run() == nil
}

func (m *Manager) IssueSession(username string, ttl time.Duration) (string, error) {
	return signToken(m.sessionSecret, Claims{Sub: username, Typ: "session", Exp: time.Now().Add(ttl).Unix()})
}

func (m *Manager) IssueScopedToken(subject, tokenType string, ttl time.Duration) (string, error) {
	return signToken(m.sessionSecret, Claims{
		Sub: subject,
		Typ: tokenType,
		Exp: time.Now().Add(ttl).Unix(),
	})
}

func (m *Manager) VerifySession(token string) (Claims, error) {
	return verifyToken(m.sessionSecret, token, "session")
}

func (m *Manager) VerifyScopedToken(token, tokenType string) (Claims, error) {
	return verifyToken(m.sessionSecret, token, tokenType)
}

func (m *Manager) VerifyAccessToken(token string) (Claims, error) {
	return verifyJWT(m.appPublicKey, token)
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

func verifyJWT(publicKey *rsa.PublicKey, token string) (Claims, error) {
	var claims Claims
	if publicKey == nil {
		return claims, errors.New("app public key is not configured")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return claims, errors.New("invalid jwt format")
	}

	var header struct {
		Alg string `json:"alg"`
	}
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return claims, fmt.Errorf("decode jwt header: %w", err)
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return claims, fmt.Errorf("parse jwt header: %w", err)
	}
	if header.Alg != "RS256" {
		return claims, fmt.Errorf("unexpected jwt alg %s", header.Alg)
	}

	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return claims, fmt.Errorf("decode jwt signature: %w", err)
	}
	sum := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, sum[:], sig); err != nil {
		return claims, errors.New("invalid jwt signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return claims, fmt.Errorf("decode jwt payload: %w", err)
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return claims, fmt.Errorf("parse jwt payload: %w", err)
	}
	if strings.TrimSpace(claims.Sub) == "" {
		return claims, errors.New("jwt sub is required")
	}
	if claims.Exp == 0 {
		return claims, errors.New("jwt exp is required")
	}
	if time.Now().Unix() >= claims.Exp {
		return claims, errors.New("token expired")
	}
	claims.Typ = "access"
	return claims, nil
}

func LoadRSAPublicKey(path string) (*rsa.PublicKey, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read public key: %w", err)
	}
	block, _ := pem.Decode(content)
	if block == nil {
		return nil, errors.New("invalid pem public key")
	}
	switch block.Type {
	case "PUBLIC KEY":
		key, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("parse public key: %w", err)
		}
		rsaKey, ok := key.(*rsa.PublicKey)
		if !ok {
			return nil, errors.New("public key is not RSA")
		}
		return rsaKey, nil
	case "RSA PUBLIC KEY":
		key, err := x509.ParsePKCS1PublicKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("parse rsa public key: %w", err)
		}
		return key, nil
	case "CERTIFICATE":
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("parse certificate: %w", err)
		}
		rsaKey, ok := cert.PublicKey.(*rsa.PublicKey)
		if !ok {
			return nil, errors.New("certificate public key is not RSA")
		}
		return rsaKey, nil
	default:
		return nil, fmt.Errorf("unsupported pem block type %s", block.Type)
	}
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
