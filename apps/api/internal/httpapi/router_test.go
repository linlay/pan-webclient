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

type namedRow struct {
	Name string `json:"name"`
}

type namedTreeNode struct {
	Name        string `json:"name"`
	HasChildren bool   `json:"hasChildren"`
}

type pathRow struct {
	Path string `json:"path"`
}

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

func TestHiddenFilesToggleAffectsFilesTreeAndSearch(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "visible.txt"), []byte("visible"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".hidden.txt"), []byte("hidden"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(root, ".secret"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".secret", "note.txt"), []byte("note"), 0o644); err != nil {
		t.Fatal(err)
	}

	dbPath := filepath.Join(t.TempDir(), "pan.db")
	store := indexer.NewStore(dbPath)
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	resolver := fsops.NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}})
	entries, err := fsops.CollectEntries("root", root, true)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.ReplaceMountSnapshot("root", entries); err != nil {
		t.Fatal(err)
	}

	authManager := auth.NewManager("secret", "secret2", "admin", "pw")
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
		Auth:        authManager,
		TaskManager: transfer.NewManager(store),
	})
	cookie := issueTestSession(t, authManager)

	filesRec := authedRequest(handler, cookie, http.MethodGet, "/api/files?mountId=root&path=/", nil)
	if filesRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", filesRec.Code)
	}
	var visibleFiles []namedRow
	if err := json.Unmarshal(filesRec.Body.Bytes(), &visibleFiles); err != nil {
		t.Fatal(err)
	}
	if containsName(visibleFiles, ".hidden.txt") || containsName(visibleFiles, ".secret") {
		t.Fatalf("did not expect hidden files without toggle, got %+v", visibleFiles)
	}

	allFilesRec := authedRequest(handler, cookie, http.MethodGet, "/api/files?mountId=root&path=/&showHidden=1", nil)
	var allFiles []namedRow
	if err := json.Unmarshal(allFilesRec.Body.Bytes(), &allFiles); err != nil {
		t.Fatal(err)
	}
	if !containsName(allFiles, ".hidden.txt") || !containsName(allFiles, ".secret") {
		t.Fatalf("expected hidden files with toggle, got %+v", allFiles)
	}

	treeRec := authedRequest(handler, cookie, http.MethodGet, "/api/tree?mountId=root&path=/", nil)
	var visibleTree []namedTreeNode
	if err := json.Unmarshal(treeRec.Body.Bytes(), &visibleTree); err != nil {
		t.Fatal(err)
	}
	if len(visibleTree) != 0 {
		t.Fatalf("expected hidden directory to be absent without toggle, got %+v", visibleTree)
	}

	allTreeRec := authedRequest(handler, cookie, http.MethodGet, "/api/tree?mountId=root&path=/&showHidden=1", nil)
	var allTree []namedTreeNode
	if err := json.Unmarshal(allTreeRec.Body.Bytes(), &allTree); err != nil {
		t.Fatal(err)
	}
	if len(allTree) != 1 || allTree[0].Name != ".secret" || !allTree[0].HasChildren {
		t.Fatalf("expected hidden tree node with children, got %+v", allTree)
	}

	searchRec := authedRequest(handler, cookie, http.MethodGet, "/api/search?q=note", nil)
	var hiddenOff []pathRow
	if err := json.Unmarshal(searchRec.Body.Bytes(), &hiddenOff); err != nil {
		t.Fatal(err)
	}
	if len(hiddenOff) != 0 {
		t.Fatalf("expected hidden search results to be filtered, got %+v", hiddenOff)
	}

	searchAllRec := authedRequest(handler, cookie, http.MethodGet, "/api/search?q=note&showHidden=1", nil)
	var hiddenOn []pathRow
	if err := json.Unmarshal(searchAllRec.Body.Bytes(), &hiddenOn); err != nil {
		t.Fatal(err)
	}
	if len(hiddenOn) != 1 || hiddenOn[0].Path != "/.secret/note.txt" {
		t.Fatalf("expected hidden search result with toggle, got %+v", hiddenOn)
	}
}

func issueTestSession(t *testing.T, manager *auth.Manager) *http.Cookie {
	t.Helper()
	session, err := manager.IssueSession("admin", 0x7fffffffffffffff)
	if err != nil {
		t.Fatal(err)
	}
	return &http.Cookie{Name: "pan_session", Value: session}
}

func authedRequest(handler http.Handler, cookie *http.Cookie, method, path string, body []byte) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.AddCookie(cookie)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func containsName(items []namedRow, name string) bool {
	for _, item := range items {
		if item.Name == name {
			return true
		}
	}
	return false
}
