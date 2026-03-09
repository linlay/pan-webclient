package auth

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

const testPasswordHash = "$2y$10$yuAuDodfV2Ko0nPhw6ogPOr6s1RGApvBz85NMPhL4Set882iEjfdm"

func TestCheckCredentialsUsesBcryptHash(t *testing.T) {
	manager := NewManager("session-secret", nil, "admin", testPasswordHash)

	if !manager.CheckCredentials("admin", "change-this-password") {
		t.Fatal("expected valid credentials")
	}
	if manager.CheckCredentials("admin", "wrong-password") {
		t.Fatal("expected invalid password to be rejected")
	}
}

func TestVerifyAccessTokenWithRS256JWT(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	manager := NewManager("session-secret", &privateKey.PublicKey, "admin", testPasswordHash)

	token := signTestJWT(t, privateKey, map[string]any{
		"sub": "mobile-user",
		"exp": time.Now().Add(time.Hour).Unix(),
	})

	claims, err := manager.VerifyAccessToken(token)
	if err != nil {
		t.Fatalf("VerifyAccessToken() error = %v", err)
	}
	if claims.Sub != "mobile-user" || claims.Typ != "access" {
		t.Fatalf("unexpected claims = %+v", claims)
	}
}

func TestVerifyAccessTokenRejectsInvalidJWT(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	manager := NewManager("session-secret", &privateKey.PublicKey, "admin", testPasswordHash)

	valid := signTestJWT(t, privateKey, map[string]any{
		"sub": "mobile-user",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	parts := strings.Split(valid, ".")
	if len(parts) != 3 {
		t.Fatalf("unexpected jwt parts: %d", len(parts))
	}
	parts[1] = base64.RawURLEncoding.EncodeToString([]byte(`{"sub":"mobile-user","exp":1}`))
	if _, err := manager.VerifyAccessToken(strings.Join(parts, ".")); err == nil || err.Error() != "invalid jwt signature" {
		t.Fatalf("expected invalid signature error, got %v", err)
	}

	expired := signTestJWT(t, privateKey, map[string]any{
		"sub": "mobile-user",
		"exp": time.Now().Add(-time.Minute).Unix(),
	})
	if _, err := manager.VerifyAccessToken(expired); err == nil || err.Error() != "token expired" {
		t.Fatalf("expected token expired error, got %v", err)
	}

	missingSub := signTestJWT(t, privateKey, map[string]any{
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	if _, err := manager.VerifyAccessToken(missingSub); err == nil || err.Error() != "jwt sub is required" {
		t.Fatalf("expected missing sub error, got %v", err)
	}
}

func signTestJWT(t *testing.T, privateKey *rsa.PrivateKey, claims map[string]any) string {
	t.Helper()
	headerJSON, err := json.Marshal(map[string]string{"alg": "RS256", "typ": "JWT"})
	if err != nil {
		t.Fatal(err)
	}
	payloadJSON, err := json.Marshal(claims)
	if err != nil {
		t.Fatal(err)
	}
	header := base64.RawURLEncoding.EncodeToString(headerJSON)
	payload := base64.RawURLEncoding.EncodeToString(payloadJSON)
	signingInput := header + "." + payload
	sum := sha256.Sum256([]byte(signingInput))
	signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, sum[:])
	if err != nil {
		t.Fatal(err)
	}
	return signingInput + "." + base64.RawURLEncoding.EncodeToString(signature)
}
