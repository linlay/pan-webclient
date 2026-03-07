package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"pan-webclient/apps/api/internal/auth"
	"pan-webclient/apps/api/internal/config"
	"pan-webclient/apps/api/internal/fsops"
	"pan-webclient/apps/api/internal/indexer"
	"pan-webclient/apps/api/internal/mounts"
	"pan-webclient/apps/api/internal/transfer"
)

func TestProtectedRouteRejectsTraversal(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "hello.txt"), []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}
	dbPath := filepath.Join(t.TempDir(), "pan.db")
	store := indexer.NewStore(dbPath)
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	resolver := fsops.NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}})
	handler := New(Dependencies{
		Config: config.Config{
			SessionCookieName: "pan_session",
			SessionSecret:     "secret",
			TokenSigningKey:   "secret2",
			AdminUsername:     "admin",
			AdminPassword:     "pw",
			TrashDir:          filepath.Join(t.TempDir(), "trash"),
			MaxEditFileBytes:  1024 * 1024,
		},
		Resolver:    resolver,
		Store:       store,
		Auth:        auth.NewManager("secret", "secret2", "admin", "pw"),
		TaskManager: transfer.NewManager(store),
	})

	session, err := auth.NewManager("secret", "secret2", "admin", "pw").IssueSession("admin", 0x7fffffffffffffff)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/files?mountId=root&path=../../", nil)
	req.AddCookie(&http.Cookie{Name: "pan_session", Value: session})
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestWebLoginAndSessionMe(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "pan.db")
	store := indexer.NewStore(dbPath)
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	handler := New(Dependencies{
		Config: config.Config{
			SessionCookieName: "pan_session",
			SessionSecret:     "secret",
			TokenSigningKey:   "secret2",
			AdminUsername:     "admin",
			AdminPassword:     "pw",
			TrashDir:          filepath.Join(t.TempDir(), "trash"),
			MaxEditFileBytes:  1024 * 1024,
		},
		Resolver:    fsops.NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}}),
		Store:       store,
		Auth:        auth.NewManager("secret", "secret2", "admin", "pw"),
		TaskManager: transfer.NewManager(store),
	})

	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "pw"})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/web/session/login", bytes.NewReader(body))
	loginRec := httptest.NewRecorder()
	handler.ServeHTTP(loginRec, loginReq)
	if loginRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", loginRec.Code)
	}
	cookies := loginRec.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("expected session cookie")
	}

	meReq := httptest.NewRequest(http.MethodGet, "/api/web/session/me", nil)
	meReq.AddCookie(cookies[0])
	meRec := httptest.NewRecorder()
	handler.ServeHTTP(meRec, meReq)
	if meRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", meRec.Code)
	}
}
