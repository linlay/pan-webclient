package config

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const testBcryptHash = "$2y$10$yuAuDodfV2Ko0nPhw6ogPOr6s1RGApvBz85NMPhL4Set882iEjfdm"

const testPublicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWLQCwV7SKGetHzllDFK
iVWID+Bb8O+B8yjbs2qc3yzN26B5OcWZ7BSImJeEPVBQo2L15cCyDzckXC3vma92
TJtTVm/Vm2v5Gq9VlOcC/zOWsTwu7tFca3QzbVNQJ5yrviWYdqYI74twAqGV9M2a
CdVWSN48lFRRut6N/OLanhH6VoNjOVqhcMyZjcw8xZQYvEXxavTWTB5pHu/3S70y
TJ5xre9sJSaxiVJeivMOoSOAm9li0cpc71kuNA9ZkN4BcBjUF0JVVirInedKb0w+
crxQhme8HlRs3mtYwSCTUsRXTMWZ3BB3A72xWu3Ts1NDaIV5GMMjN1sKo0aPqbU6
QwIDAQAB
-----END PUBLIC KEY-----
`

func TestLoadDerivesWebOriginFromWebPort(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("WEB_PORT", "11946")
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.WebPort != "11946" {
		t.Fatalf("WebPort = %q, want %q", cfg.WebPort, "11946")
	}
	if cfg.WebOrigin != "http://127.0.0.1:11946" {
		t.Fatalf("WebOrigin = %q, want %q", cfg.WebOrigin, "http://127.0.0.1:11946")
	}
}

func TestLoadPreservesExplicitWebOrigin(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("WEB_PORT", "11946")
	t.Setenv("WEB_ORIGIN", "http://127.0.0.1:13000")
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.WebOrigin != "http://127.0.0.1:13000" {
		t.Fatalf("WebOrigin = %q, want %q", cfg.WebOrigin, "http://127.0.0.1:13000")
	}
}

func TestLoadUsesDefaultPorts(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.AppPort != "8080" {
		t.Fatalf("AppPort = %q, want %q", cfg.AppPort, "8080")
	}
	if cfg.WebPort != "5173" {
		t.Fatalf("WebPort = %q, want %q", cfg.WebPort, "5173")
	}
	if cfg.WebOrigin != "http://127.0.0.1:5173" {
		t.Fatalf("WebOrigin = %q, want %q", cfg.WebOrigin, "http://127.0.0.1:5173")
	}
}

func TestLoadRequiresSecretsAndPublicKeyFile(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)

	if _, err := Load(); err == nil || err.Error() != "WEB_SESSION_SECRET is required" {
		t.Fatalf("expected missing session secret error, got %v", err)
	}

	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	if _, err := Load(); err == nil || err.Error() != "AUTH_PASSWORD_HASH_BCRYPT is required" {
		t.Fatalf("expected missing bcrypt hash error, got %v", err)
	}

	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)
	missingKey := filepath.Join(dir, "configs", "missing-public-key.pem")
	t.Setenv("APP_AUTH_LOCAL_PUBLIC_KEY_FILE", missingKey)
	if _, err := Load(); err == nil || err.Error() != "read app auth local public key file "+missingKey+": open "+missingKey+": no such file or directory" {
		t.Fatalf("expected missing public key error, got %v", err)
	}
}

func TestLoadResolvesPublicKeyRelativeToDotEnvDir(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte(strings.Join([]string{
		"WEB_SESSION_SECRET=session-secret",
		"AUTH_PASSWORD_HASH_BCRYPT=" + testBcryptHash,
		"APP_AUTH_LOCAL_PUBLIC_KEY_FILE=./configs/local-public-key.pem",
	}, "\n")), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if !samePath(t, cfg.AppAuthLocalPublicKeyFile, filepath.Join(dir, "configs", "local-public-key.pem")) {
		t.Fatalf("AppAuthLocalPublicKeyFile = %q, want %q", cfg.AppAuthLocalPublicKeyFile, filepath.Join(dir, "configs", "local-public-key.pem"))
	}
}

func TestLoadFindsParentDotEnvAndResolvesPublicKeyFromEnvDir(t *testing.T) {
	clearConfigEnv(t)
	runtimeRoot := t.TempDir()
	previousWD, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	backendDir := filepath.Join(runtimeRoot, "backend")
	if err := os.MkdirAll(filepath.Join(runtimeRoot, "configs"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(backendDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(runtimeRoot, "configs", "local-public-key.pem"), []byte(testPublicKeyPEM), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(runtimeRoot, ".env"), []byte(strings.Join([]string{
		"WEB_SESSION_SECRET=session-secret",
		"AUTH_PASSWORD_HASH_BCRYPT=" + testBcryptHash,
		"APP_AUTH_LOCAL_PUBLIC_KEY_FILE=./configs/local-public-key.pem",
	}, "\n")), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(backendDir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(previousWD); err != nil {
			t.Fatalf("restore working directory: %v", err)
		}
	})

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if !samePath(t, cfg.AppAuthLocalPublicKeyFile, filepath.Join(runtimeRoot, "configs", "local-public-key.pem")) {
		t.Fatalf("AppAuthLocalPublicKeyFile = %q, want %q", cfg.AppAuthLocalPublicKeyFile, filepath.Join(runtimeRoot, "configs", "local-public-key.pem"))
	}
}

func TestLoadRejectsInvalidPublicKeyPEM(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)
	invalidPath := filepath.Join(dir, "configs", "invalid-public-key.pem")
	if err := os.WriteFile(invalidPath, []byte("not-a-pem"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("APP_AUTH_LOCAL_PUBLIC_KEY_FILE", invalidPath)

	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "parse app auth local public key file "+invalidPath+": pem decode failed") {
		t.Fatalf("expected invalid pem error, got %v", err)
	}
}

func TestLoadRejectsNonRSAPublicKey(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	ecdsaKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(&ecdsaKey.PublicKey)
	if err != nil {
		t.Fatal(err)
	}
	invalidPath := filepath.Join(dir, "configs", "ecdsa-public-key.pem")
	if err := os.WriteFile(invalidPath, pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	}), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("APP_AUTH_LOCAL_PUBLIC_KEY_FILE", invalidPath)

	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "parse app auth local public key file "+invalidPath+": rsa parse failed") {
		t.Fatalf("expected non-rsa error, got %v", err)
	}
}

func TestLoadIgnoresLegacyPublicKeyEnvVar(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)
	t.Setenv("AUTH_APP_PUBLIC_KEY_FILE", filepath.Join(dir, "configs", "legacy-only.pem"))

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if !samePath(t, cfg.AppAuthLocalPublicKeyFile, filepath.Join(dir, "configs", "local-public-key.pem")) {
		t.Fatalf("AppAuthLocalPublicKeyFile = %q, want default public key path", cfg.AppAuthLocalPublicKeyFile)
	}
}

func TestLoadMountsFromConfigFiles(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	mountsDir := filepath.Join(dir, "configs", "mounts")
	if err := os.MkdirAll(mountsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(mountsDir, "home.json"), []byte(`{"id":"home","name":"Home","path":"./home-dir"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(mountsDir, "media.example.json"), []byte(`{"id":"media","name":"Media","path":"./media-dir"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "home-dir"), 0o755); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if len(cfg.Mounts) != 1 {
		t.Fatalf("Mounts len = %d, want 1", len(cfg.Mounts))
	}
	if cfg.Mounts[0].ID != "home" || cfg.Mounts[0].Name != "Home" {
		t.Fatalf("unexpected mount = %+v", cfg.Mounts[0])
	}
	if !samePath(t, cfg.Mounts[0].Path, filepath.Join(dir, "home-dir")) {
		t.Fatalf("Mount path = %q, want %q", cfg.Mounts[0].Path, filepath.Join(dir, "home-dir"))
	}
}

func TestLoadFallsBackToPanMountsEnv(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)
	t.Setenv("PAN_MOUNTS", "docs|Docs|./docs")

	if err := os.MkdirAll(filepath.Join(dir, "docs"), 0o755); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if len(cfg.Mounts) != 1 || cfg.Mounts[0].ID != "docs" {
		t.Fatalf("unexpected mounts = %+v", cfg.Mounts)
	}
	if !samePath(t, cfg.Mounts[0].Path, filepath.Join(dir, "docs")) {
		t.Fatalf("Mount path = %q, want %q", cfg.Mounts[0].Path, filepath.Join(dir, "docs"))
	}
}

func clearConfigEnv(t *testing.T) {
	t.Helper()
	for _, key := range []string{
		"APP_PORT",
		"WEB_PORT",
		"WEB_ORIGIN",
		"APP_AUTH_LOCAL_PUBLIC_KEY_FILE",
		"AUTH_APP_PUBLIC_KEY_FILE",
		"PAN_STATIC_DIR",
		"PAN_DATA_DIR",
		"SESSION_COOKIE_NAME",
		"WEB_SESSION_SECRET",
		"PAN_ADMIN_USERNAME",
		"AUTH_PASSWORD_HASH_BCRYPT",
		"MAX_UPLOAD_BYTES",
		"MAX_EDIT_FILE_BYTES",
		"PAN_MOUNTS",
	} {
		t.Setenv(key, "")
	}
}

func prepareConfigWorkspace(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	previousWD, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(previousWD); err != nil {
			t.Fatalf("restore working directory: %v", err)
		}
	})

	if err := os.MkdirAll(filepath.Join(dir, "configs"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "configs", "local-public-key.pem"), []byte(testPublicKeyPEM), 0o644); err != nil {
		t.Fatal(err)
	}
	return dir
}

func samePath(t *testing.T, got, want string) bool {
	t.Helper()
	gotResolved, err := filepath.EvalSymlinks(got)
	if err != nil {
		t.Fatal(err)
	}
	wantResolved, err := filepath.EvalSymlinks(want)
	if err != nil {
		t.Fatal(err)
	}
	return gotResolved == wantResolved
}
