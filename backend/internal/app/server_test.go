package app

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"pan-webclient/backend/internal/config"
	"pan-webclient/backend/internal/indexer"
)

func TestEnsureRuntimeDirsCreatesRequiredDirectoriesUnderDataDir(t *testing.T) {
	dataDir := filepath.Join(t.TempDir(), "runtime-data")

	if err := EnsureRuntimeDirs(config.Config{DataDir: dataDir}); err != nil {
		t.Fatalf("EnsureRuntimeDirs() error = %v", err)
	}

	store := indexer.NewStore(dataDir)
	for _, path := range []string{store.TasksDir(), store.TrashItemsDir()} {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatalf("stat %s: %v", path, err)
		}
		if !info.IsDir() {
			t.Fatalf("%s is not a directory", path)
		}
	}
}

func TestEnsureRuntimeDirsDoesNotMigrateLegacyAppsData(t *testing.T) {
	runtimeRoot := t.TempDir()
	previousWD, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(runtimeRoot); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(previousWD); err != nil {
			t.Fatalf("restore working directory: %v", err)
		}
	})

	legacyTrashDir := filepath.Join(runtimeRoot, "apps", "api", "data", "trash")
	if err := os.MkdirAll(legacyTrashDir, 0o755); err != nil {
		t.Fatal(err)
	}
	legacyMarker := filepath.Join(legacyTrashDir, "legacy.txt")
	if err := os.WriteFile(legacyMarker, []byte("legacy"), 0o644); err != nil {
		t.Fatal(err)
	}

	dataDir := filepath.Join(runtimeRoot, "data")
	if err := EnsureRuntimeDirs(config.Config{DataDir: dataDir}); err != nil {
		t.Fatalf("EnsureRuntimeDirs() error = %v", err)
	}

	if _, err := os.Stat(legacyMarker); err != nil {
		t.Fatalf("legacy data should remain untouched, stat %s: %v", legacyMarker, err)
	}

	store := indexer.NewStore(dataDir)
	for _, path := range []string{store.TasksDir(), store.TrashItemsDir()} {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatalf("stat %s: %v", path, err)
		}
		if !info.IsDir() {
			t.Fatalf("%s is not a directory", path)
		}
	}
}

func TestNewFailsWhenHtpasswdIsUnavailable(t *testing.T) {
	originalLookPath := lookPath
	lookPath = func(file string) (string, error) {
		return "", &execError{name: file}
	}
	t.Cleanup(func() {
		lookPath = originalLookPath
	})

	_, err := New(config.Config{
		APIPort:           "8080",
		DataDir:           t.TempDir(),
		SessionSecret:     "session-secret",
		AdminUsername:     "admin",
		AdminPasswordHash: "bcrypt-hash",
	})
	if err == nil || !strings.Contains(err.Error(), "web login requires htpasswd in PATH") {
		t.Fatalf("expected missing htpasswd error, got %v", err)
	}
}

func TestNewAcceptsAvailableHtpasswd(t *testing.T) {
	originalLookPath := lookPath
	lookPath = func(file string) (string, error) {
		if file != "htpasswd" {
			t.Fatalf("lookPath called with %q, want htpasswd", file)
		}
		return "/usr/bin/htpasswd", nil
	}
	t.Cleanup(func() {
		lookPath = originalLookPath
	})

	keyPath := writeTestRSAPublicKey(t)
	server, err := New(config.Config{
		APIPort:                   "8080",
		DataDir:                   t.TempDir(),
		SessionSecret:             "session-secret",
		AdminUsername:             "admin",
		AdminPasswordHash:         "bcrypt-hash",
		AppAuthLocalPublicKeyFile: keyPath,
	})
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	if server == nil {
		t.Fatal("expected server")
	}
}

func writeTestRSAPublicKey(t *testing.T) string {
	t.Helper()
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		t.Fatal(err)
	}
	publicKeyPath := filepath.Join(t.TempDir(), "local-public-key.pem")
	if err := os.WriteFile(publicKeyPath, pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	}), 0o644); err != nil {
		t.Fatal(err)
	}
	return publicKeyPath
}

type execError struct {
	name string
}

func (e *execError) Error() string {
	return "executable file not found in $PATH: " + e.name
}
