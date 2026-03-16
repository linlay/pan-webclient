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

	"pan-webclient/backend/internal/auth"
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

func TestLoadUsesExplicitAPIPort(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("API_PORT", "18080")
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.APIPort != "18080" {
		t.Fatalf("APIPort = %q, want %q", cfg.APIPort, "18080")
	}
}

func TestLoadUsesDefaultAPIPort(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.APIPort != "8080" {
		t.Fatalf("APIPort = %q, want %q", cfg.APIPort, "8080")
	}
}

func TestLoadUsesDefaultUploadLimit(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.MaxUploadBytes != 20*1024*1024 {
		t.Fatalf("MaxUploadBytes = %d, want %d", cfg.MaxUploadBytes, 20*1024*1024)
	}
}

func TestLoadIgnoresLegacyBrowserPortEnvVars(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("PUBLIC_PORT", "11946")
	t.Setenv("DEV_WEB_PORT", "11936")
	t.Setenv("NGINX_PORT", "11947")
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.APIPort != "8080" {
		t.Fatalf("APIPort = %q, want default 8080 when browser port vars are ignored", cfg.APIPort)
	}
}

func TestLoadIgnoresLegacyPortEnvVars(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("APP_PORT", "11936")
	t.Setenv("WEB_PORT", "11946")
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.APIPort != "8080" {
		t.Fatalf("APIPort = %q, want default 8080 when legacy vars are ignored", cfg.APIPort)
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

func TestLoadNormalizesQuotedStringEnvValues(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	if err := os.MkdirAll(filepath.Join(dir, "quoted-docs"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "quoted-data"), 0o755); err != nil {
		t.Fatal(err)
	}

	t.Setenv("API_PORT", " '18080' ")
	t.Setenv("WEB_SESSION_SECRET", " 'session-secret' ")
	t.Setenv("PAN_ADMIN_USERNAME", ` "admin" `)
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", " '"+testBcryptHash+"' ")
	t.Setenv("APP_AUTH_LOCAL_PUBLIC_KEY_FILE", " './configs/local-public-key.pem' ")
	t.Setenv("PAN_DATA_DIR", ` "./quoted-data" `)
	t.Setenv("SESSION_COOKIE_NAME", " 'quoted_session' ")
	t.Setenv("PAN_MOUNTS", ` "docs|Docs|./quoted-docs" `)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.APIPort != "18080" {
		t.Fatalf("APIPort = %q, want %q", cfg.APIPort, "18080")
	}
	if cfg.SessionSecret != "session-secret" {
		t.Fatalf("SessionSecret = %q, want %q", cfg.SessionSecret, "session-secret")
	}
	if cfg.AdminUsername != "admin" {
		t.Fatalf("AdminUsername = %q, want %q", cfg.AdminUsername, "admin")
	}
	if cfg.AdminPasswordHash != testBcryptHash {
		t.Fatalf("AdminPasswordHash = %q, want %q", cfg.AdminPasswordHash, testBcryptHash)
	}
	if cfg.SessionCookieName != "quoted_session" {
		t.Fatalf("SessionCookieName = %q, want %q", cfg.SessionCookieName, "quoted_session")
	}
	if !samePath(t, cfg.AppAuthLocalPublicKeyFile, filepath.Join(dir, "configs", "local-public-key.pem")) {
		t.Fatalf("AppAuthLocalPublicKeyFile = %q, want %q", cfg.AppAuthLocalPublicKeyFile, filepath.Join(dir, "configs", "local-public-key.pem"))
	}
	if !samePath(t, cfg.DataDir, filepath.Join(dir, "quoted-data")) {
		t.Fatalf("DataDir = %q, want %q", cfg.DataDir, filepath.Join(dir, "quoted-data"))
	}
	if len(cfg.Mounts) != 1 || cfg.Mounts[0].ID != "docs" || cfg.Mounts[0].Name != "Docs" {
		t.Fatalf("unexpected mounts = %+v", cfg.Mounts)
	}
	if !samePath(t, cfg.Mounts[0].Path, filepath.Join(dir, "quoted-docs")) {
		t.Fatalf("Mount path = %q, want %q", cfg.Mounts[0].Path, filepath.Join(dir, "quoted-docs"))
	}
}

func TestLoadNormalizesQuotedPasswordHashFromEnv(t *testing.T) {
	for _, tc := range []struct {
		name     string
		rawValue string
	}{
		{name: "single quotes", rawValue: "'" + testBcryptHash + "'"},
		{name: "double quotes", rawValue: `"` + testBcryptHash + `"`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			clearConfigEnv(t)
			prepareConfigWorkspace(t)
			t.Setenv("WEB_SESSION_SECRET", "session-secret")
			t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", tc.rawValue)

			cfg, err := Load()
			if err != nil {
				t.Fatalf("Load() error = %v", err)
			}

			if cfg.AdminPasswordHash != testBcryptHash {
				t.Fatalf("AdminPasswordHash = %q, want %q", cfg.AdminPasswordHash, testBcryptHash)
			}
		})
	}
}

func TestLoadQuotedPasswordHashWorksWithAuthManager(t *testing.T) {
	clearConfigEnv(t)
	prepareConfigWorkspace(t)
	t.Setenv("PAN_ADMIN_USERNAME", "admin")
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", "'"+testBcryptHash+"'")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	manager := auth.NewManager(cfg.SessionSecret, nil, cfg.AdminUsername, cfg.AdminPasswordHash)
	if !manager.CheckCredentials("admin", "change-this-password") {
		t.Fatal("expected valid credentials after config normalization")
	}
	if manager.CheckCredentials("admin", "wrong-password") {
		t.Fatal("expected invalid credentials to be rejected")
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

func TestLoadFindsParentDotEnvAndResolvesConfigAndDataPathsFromEnvDir(t *testing.T) {
	clearConfigEnv(t)
	runtimeRoot := t.TempDir()
	previousWD, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	backendDir := filepath.Join(runtimeRoot, "backend")
	mountsDir := filepath.Join(runtimeRoot, "configs", "mounts")
	if err := os.MkdirAll(mountsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(backendDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(runtimeRoot, "data"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(runtimeRoot, "shared-docs"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(runtimeRoot, "configs", "local-public-key.pem"), []byte(testPublicKeyPEM), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(mountsDir, "docs.json"), []byte(`{"id":"docs","name":"Docs","path":"./shared-docs"}`), 0o644); err != nil {
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
	if !samePath(t, cfg.DataDir, filepath.Join(runtimeRoot, "data")) {
		t.Fatalf("DataDir = %q, want %q", cfg.DataDir, filepath.Join(runtimeRoot, "data"))
	}
	if len(cfg.Mounts) != 1 || cfg.Mounts[0].ID != "docs" || cfg.Mounts[0].Name != "Docs" {
		t.Fatalf("unexpected mounts = %+v", cfg.Mounts)
	}
	if !samePath(t, cfg.Mounts[0].Path, filepath.Join(runtimeRoot, "shared-docs")) {
		t.Fatalf("Mount path = %q, want %q", cfg.Mounts[0].Path, filepath.Join(runtimeRoot, "shared-docs"))
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

func TestLoadMountsFromConfigFilesSupportsSourceAndReadOnly(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	mountsDir := filepath.Join(dir, "configs", "mounts")
	if err := os.MkdirAll(mountsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "host-downloads"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(mountsDir, "downloads.json"), []byte(`{"id":"downloads","name":"Downloads","source":"./host-downloads","path":"/mnt/pan/downloads","readOnly":true}`), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if len(cfg.Mounts) != 1 {
		t.Fatalf("Mounts len = %d, want 1", len(cfg.Mounts))
	}
	if !samePath(t, cfg.Mounts[0].Source, filepath.Join(dir, "host-downloads")) {
		t.Fatalf("Mount source = %q, want %q", cfg.Mounts[0].Source, filepath.Join(dir, "host-downloads"))
	}
	if cfg.Mounts[0].Path != "/mnt/pan/downloads" {
		t.Fatalf("Mount path = %q, want %q", cfg.Mounts[0].Path, "/mnt/pan/downloads")
	}
	if !cfg.Mounts[0].ReadOnly {
		t.Fatal("expected mount to be read-only")
	}
}

func TestLoadMountsFromConfigFilesDefaultsPathToSource(t *testing.T) {
	clearConfigEnv(t)
	dir := prepareConfigWorkspace(t)
	t.Setenv("WEB_SESSION_SECRET", "session-secret")
	t.Setenv("AUTH_PASSWORD_HASH_BCRYPT", testBcryptHash)

	mountsDir := filepath.Join(dir, "configs", "mounts")
	if err := os.MkdirAll(mountsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "notes"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(mountsDir, "notes.json"), []byte(`{"id":"notes","name":"Notes","source":"./notes"}`), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if len(cfg.Mounts) != 1 {
		t.Fatalf("Mounts len = %d, want 1", len(cfg.Mounts))
	}
	if !samePath(t, cfg.Mounts[0].Source, filepath.Join(dir, "notes")) {
		t.Fatalf("Mount source = %q, want %q", cfg.Mounts[0].Source, filepath.Join(dir, "notes"))
	}
	if !samePath(t, cfg.Mounts[0].Path, filepath.Join(dir, "notes")) {
		t.Fatalf("Mount path = %q, want %q", cfg.Mounts[0].Path, filepath.Join(dir, "notes"))
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
		"API_PORT",
		"NGINX_PORT",
		"PUBLIC_PORT",
		"DEV_WEB_PORT",
		"APP_PORT",
		"WEB_PORT",
		"APP_AUTH_LOCAL_PUBLIC_KEY_FILE",
		"AUTH_APP_PUBLIC_KEY_FILE",
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
