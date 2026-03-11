package httpapi

import (
	"bytes"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"pan-webclient/backend/internal/auth"
	"pan-webclient/backend/internal/config"
	"pan-webclient/backend/internal/fsops"
	"pan-webclient/backend/internal/indexer"
	"pan-webclient/backend/internal/mounts"
	"pan-webclient/backend/internal/transfer"
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

type trashRow struct {
	ID           string `json:"id"`
	OriginalPath string `json:"originalPath"`
}

const routerTestPasswordHash = "$2y$10$yuAuDodfV2Ko0nPhw6ogPOr6s1RGApvBz85NMPhL4Set882iEjfdm"

func TestProtectedRouteRejectsTraversal(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "hello.txt"), []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}
	handler := newTestHandler(t, root)
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	req := httptest.NewRequest(http.MethodGet, "/api/files?mountId=root&path=../../", nil)
	req.AddCookie(cookie)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestWebLoginAndSessionMe(t *testing.T) {
	root := t.TempDir()
	handler := newTestHandler(t, root)

	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "change-this-password"})
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

func TestBearerTokenAuthUsesInjectedJWT(t *testing.T) {
	root := t.TempDir()
	handler, privateKey := newJWTTestHandler(t, root)

	token := signRouterTestJWT(t, privateKey, map[string]any{
		"sub": "mobile-user",
		"exp": time.Now().Add(time.Hour).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/api/mounts", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestPrefixedAPIBaseWorksForWebAndAppModes(t *testing.T) {
	root := t.TempDir()
	handler, privateKey := newJWTTestHandler(t, root)
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	webRec := authedRequest(handler, cookie, http.MethodGet, "/pan/api/mounts", nil)
	if webRec.Code != http.StatusOK {
		t.Fatalf("expected web prefix 200, got %d: %s", webRec.Code, webRec.Body.String())
	}

	token := signRouterTestJWT(t, privateKey, map[string]any{
		"sub": "mobile-user",
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	appReq := httptest.NewRequest(http.MethodGet, "/apppan/api/mounts", nil)
	appReq.Header.Set("Authorization", "Bearer "+token)
	appRec := httptest.NewRecorder()
	handler.ServeHTTP(appRec, appReq)
	if appRec.Code != http.StatusOK {
		t.Fatalf("expected app prefix 200, got %d: %s", appRec.Code, appRec.Body.String())
	}
}

func TestStaticRoutesRedirectAndServePrefixedSPA(t *testing.T) {
	root := t.TempDir()
	staticDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(staticDir, "index.html"), []byte("INDEX"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(staticDir, "js"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(staticDir, "js", "app.js"), []byte("console.log('ok')"), 0o644); err != nil {
		t.Fatal(err)
	}

	handler := newHandlerWithConfig(root, indexer.NewStore(t.TempDir()), config.Config{
		SessionCookieName: "pan_session",
		SessionSecret:     "secret",
		AdminUsername:     "admin",
		AdminPasswordHash: routerTestPasswordHash,
		MaxEditFileBytes:  1024 * 1024,
		StaticDir:         staticDir,
	})

	for _, path := range []struct {
		requestPath string
		location    string
	}{
		{requestPath: "/", location: "/pan/"},
		{requestPath: "/pan", location: "/pan/"},
		{requestPath: "/apppan", location: "/apppan/"},
	} {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path.requestPath, nil))
		if rec.Code != http.StatusFound {
			t.Fatalf("%s expected 302, got %d", path.requestPath, rec.Code)
		}
		if location := rec.Header().Get("Location"); location != path.location {
			t.Fatalf("%s location = %q, want %q", path.requestPath, location, path.location)
		}
	}

	for _, requestPath := range []string{"/pan/", "/pan/files/view", "/apppan/"} {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, requestPath, nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("%s expected 200, got %d", requestPath, rec.Code)
		}
		if body := strings.TrimSpace(rec.Body.String()); body != "INDEX" {
			t.Fatalf("%s body = %q, want index content", requestPath, body)
		}
	}

	assetRec := httptest.NewRecorder()
	handler.ServeHTTP(assetRec, httptest.NewRequest(http.MethodGet, "/pan/js/app.js", nil))
	if assetRec.Code != http.StatusOK {
		t.Fatalf("asset expected 200, got %d", assetRec.Code)
	}
	if !strings.Contains(assetRec.Body.String(), "console.log") {
		t.Fatalf("asset body = %q, want js asset", assetRec.Body.String())
	}
}

func TestAppAuthEndpointsAreNotRegistered(t *testing.T) {
	root := t.TempDir()
	handler := newTestHandler(t, root)

	for _, path := range []string{"/api/app/auth/login", "/api/app/auth/refresh"} {
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader([]byte(`{}`)))
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("%s expected 404, got %d", path, rec.Code)
		}
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

	handler := newTestHandler(t, root)
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

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

func TestTrashLifecycleAndTaskList(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "gone.txt"), []byte("gone"), 0o644); err != nil {
		t.Fatal(err)
	}
	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	if err := store.PutTask(indexer.TaskRecord{
		ID:        "task-1",
		Kind:      "upload",
		Status:    "success",
		Detail:    "done",
		CreatedAt: 1,
		UpdatedAt: 2,
	}); err != nil {
		t.Fatal(err)
	}
	handler := newHandlerWithStore(root, store)
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	taskRec := authedRequest(handler, cookie, http.MethodGet, "/api/tasks", nil)
	if taskRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", taskRec.Code)
	}
	var taskRows []indexer.TaskRecord
	if err := json.Unmarshal(taskRec.Body.Bytes(), &taskRows); err != nil {
		t.Fatal(err)
	}
	if len(taskRows) != 1 || taskRows[0].ID != "task-1" {
		t.Fatalf("expected persisted task list, got %+v", taskRows)
	}

	deleteBody, _ := json.Marshal(map[string]string{"mountId": "root", "path": "/gone.txt"})
	deleteRec := authedRequest(handler, cookie, http.MethodPost, "/api/files/delete", deleteBody)
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("expected delete 200, got %d: %s", deleteRec.Code, deleteRec.Body.String())
	}

	trashRec := authedRequest(handler, cookie, http.MethodGet, "/api/trash", nil)
	if trashRec.Code != http.StatusOK {
		t.Fatalf("expected trash 200, got %d", trashRec.Code)
	}
	var trashRows []trashRow
	if err := json.Unmarshal(trashRec.Body.Bytes(), &trashRows); err != nil {
		t.Fatal(err)
	}
	if len(trashRows) != 1 || trashRows[0].OriginalPath != "/gone.txt" {
		t.Fatalf("expected deleted item in trash, got %+v", trashRows)
	}

	restoreBody, _ := json.Marshal(map[string][]string{"ids": []string{trashRows[0].ID}})
	restoreRec := authedRequest(handler, cookie, http.MethodPost, "/api/trash/restore", restoreBody)
	if restoreRec.Code != http.StatusOK {
		t.Fatalf("expected restore 200, got %d: %s", restoreRec.Code, restoreRec.Body.String())
	}
	if _, err := os.Stat(filepath.Join(root, "gone.txt")); err != nil {
		t.Fatalf("expected restored file: %v", err)
	}

	if err := os.WriteFile(filepath.Join(root, "gone.txt"), []byte("gone"), 0o644); err != nil {
		t.Fatal(err)
	}
	deleteRec = authedRequest(handler, cookie, http.MethodPost, "/api/files/delete", deleteBody)
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("expected delete 200, got %d: %s", deleteRec.Code, deleteRec.Body.String())
	}
	trashRec = authedRequest(handler, cookie, http.MethodGet, "/api/trash", nil)
	if trashRec.Code != http.StatusOK {
		t.Fatalf("expected trash 200, got %d", trashRec.Code)
	}
	if err := json.Unmarshal(trashRec.Body.Bytes(), &trashRows); err != nil {
		t.Fatal(err)
	}

	purgeBody, _ := json.Marshal(map[string][]string{"ids": []string{trashRows[0].ID}})
	purgeRec := authedRequest(handler, cookie, http.MethodPost, "/api/trash/delete", purgeBody)
	if purgeRec.Code != http.StatusOK {
		t.Fatalf("expected purge 200, got %d: %s", purgeRec.Code, purgeRec.Body.String())
	}
	trashRec = authedRequest(handler, cookie, http.MethodGet, "/api/trash", nil)
	if trashRec.Code != http.StatusOK {
		t.Fatalf("expected trash 200, got %d", trashRec.Code)
	}
	if err := json.Unmarshal(trashRec.Body.Bytes(), &trashRows); err != nil {
		t.Fatal(err)
	}
	if len(trashRows) != 0 {
		t.Fatalf("expected empty trash after purge, got %+v", trashRows)
	}
}

func TestTaskDownloadUsesArchiveFilename(t *testing.T) {
	root := t.TempDir()
	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	artifact := filepath.Join(store.TasksDir(), "task-1-custom archive.zip")
	if err := os.MkdirAll(filepath.Dir(artifact), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(artifact, []byte("zip"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := store.PutTask(indexer.TaskRecord{
		ID:          "task-1",
		Kind:        "download",
		Status:      "success",
		Detail:      "Archive ready",
		DownloadURL: "/api/tasks/task-1/download",
		Artifact:    artifact,
		CreatedAt:   1,
		UpdatedAt:   2,
	}); err != nil {
		t.Fatal(err)
	}

	handler := newHandlerWithStore(root, store)
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	rec := authedRequest(handler, cookie, http.MethodGet, "/api/tasks/task-1/download", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	contentDisposition := rec.Header().Get("Content-Disposition")
	if !strings.Contains(contentDisposition, `filename="custom archive.zip"`) {
		t.Fatalf("expected download filename in Content-Disposition, got %q", contentDisposition)
	}
}

func TestPrefixedPreviewAndTaskURLsUseCurrentAPIBase(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "note.txt"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	if err := store.PutTask(indexer.TaskRecord{
		ID:          "task-1",
		Kind:        "download",
		Status:      "success",
		Detail:      "Archive ready",
		DownloadURL: "/api/tasks/task-1/download",
		CreatedAt:   1,
		UpdatedAt:   2,
	}); err != nil {
		t.Fatal(err)
	}

	handler := newHandlerWithConfig(root, store, config.Config{
		SessionCookieName: "pan_session",
		SessionSecret:     "secret",
		AdminUsername:     "admin",
		AdminPasswordHash: routerTestPasswordHash,
		MaxEditFileBytes:  1,
	})
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	previewRec := authedRequest(handler, cookie, http.MethodGet, "/pan/api/preview?mountId=root&path=/note.txt", nil)
	if previewRec.Code != http.StatusOK {
		t.Fatalf("expected preview 200, got %d: %s", previewRec.Code, previewRec.Body.String())
	}
	var meta struct {
		StreamURL string `json:"streamUrl"`
	}
	if err := json.Unmarshal(previewRec.Body.Bytes(), &meta); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(meta.StreamURL, "/pan/api/files/raw?") {
		t.Fatalf("preview streamUrl = %q, want /pan/api/files/raw", meta.StreamURL)
	}

	taskListRec := authedRequest(handler, cookie, http.MethodGet, "/pan/api/tasks", nil)
	if taskListRec.Code != http.StatusOK {
		t.Fatalf("expected task list 200, got %d: %s", taskListRec.Code, taskListRec.Body.String())
	}
	var tasks []indexer.TaskRecord
	if err := json.Unmarshal(taskListRec.Body.Bytes(), &tasks); err != nil {
		t.Fatal(err)
	}
	if len(tasks) != 1 || tasks[0].DownloadURL != "/pan/api/tasks/task-1/download" {
		t.Fatalf("task download url = %+v, want /pan/api/tasks/task-1/download", tasks)
	}

	appTaskListRec := authedRequest(handler, cookie, http.MethodGet, "/apppan/api/tasks", nil)
	if appTaskListRec.Code != http.StatusOK {
		t.Fatalf("expected app task list 200, got %d: %s", appTaskListRec.Code, appTaskListRec.Body.String())
	}
	if err := json.Unmarshal(appTaskListRec.Body.Bytes(), &tasks); err != nil {
		t.Fatal(err)
	}
	if len(tasks) != 1 || tasks[0].DownloadURL != "/apppan/api/tasks/task-1/download" {
		t.Fatalf("app task download url = %+v, want /apppan/api/tasks/task-1/download", tasks)
	}
}

func TestTaskDeleteRemovesCompletedTaskAndArtifact(t *testing.T) {
	root := t.TempDir()
	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	artifact := filepath.Join(store.TasksDir(), "task-2-finished.zip")
	if err := os.WriteFile(artifact, []byte("zip"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := store.PutTask(indexer.TaskRecord{
		ID:          "task-2",
		Kind:        "download",
		Status:      "success",
		Detail:      "Archive ready",
		DownloadURL: "/api/tasks/task-2/download",
		Artifact:    artifact,
		CreatedAt:   1,
		UpdatedAt:   2,
	}); err != nil {
		t.Fatal(err)
	}

	handler := newHandlerWithStore(root, store)
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	rec := authedRequest(handler, cookie, http.MethodDelete, "/api/tasks/task-2", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if _, err := store.GetTask("task-2"); !os.IsNotExist(err) {
		t.Fatalf("expected task metadata removed, got %v", err)
	}
	if _, err := os.Stat(artifact); !os.IsNotExist(err) {
		t.Fatalf("expected artifact removed, got %v", err)
	}
}

func TestTaskDeleteRejectsActiveTask(t *testing.T) {
	root := t.TempDir()
	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	if err := store.PutTask(indexer.TaskRecord{
		ID:        "task-active",
		Kind:      "upload",
		Status:    "running",
		Detail:    "Uploading",
		CreatedAt: 1,
		UpdatedAt: 2,
	}); err != nil {
		t.Fatal(err)
	}

	handler := newHandlerWithStore(root, store)
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	rec := authedRequest(handler, cookie, http.MethodDelete, "/api/tasks/task-active", nil)
	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %s", rec.Code, rec.Body.String())
	}
}

func newTestHandler(t *testing.T, root string) http.Handler {
	t.Helper()
	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	return newHandlerWithStore(root, store)
}

func newHandlerWithStore(root string, store *indexer.Store) http.Handler {
	return newHandlerWithConfig(root, store, config.Config{
		SessionCookieName: "pan_session",
		SessionSecret:     "secret",
		AdminUsername:     "admin",
		AdminPasswordHash: routerTestPasswordHash,
		MaxEditFileBytes:  1024 * 1024,
	})
}

func newHandlerWithConfig(root string, store *indexer.Store, cfg config.Config) http.Handler {
	manager := auth.NewManager(cfg.SessionSecret, nil, cfg.AdminUsername, cfg.AdminPasswordHash)
	return New(Dependencies{
		Config:      cfg,
		Resolver:    fsops.NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}}),
		Store:       store,
		Auth:        manager,
		TaskManager: transfer.NewManager(store),
	})
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

func newJWTTestHandler(t *testing.T, root string) (http.Handler, *rsa.PrivateKey) {
	t.Helper()
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	return New(Dependencies{
		Config: config.Config{
			SessionCookieName: "pan_session",
			SessionSecret:     "secret",
			AdminUsername:     "admin",
			AdminPasswordHash: routerTestPasswordHash,
			MaxEditFileBytes:  1024 * 1024,
		},
		Resolver:    fsops.NewMountResolver([]mounts.Mount{{ID: "root", Name: "Root", Path: root}}),
		Store:       store,
		Auth:        auth.NewManager("secret", &privateKey.PublicKey, "admin", routerTestPasswordHash),
		TaskManager: transfer.NewManager(store),
	}), privateKey
}

func signRouterTestJWT(t *testing.T, privateKey *rsa.PrivateKey, claims map[string]any) string {
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
	return strings.Join([]string{header, payload, base64.RawURLEncoding.EncodeToString(signature)}, ".")
}

func containsName(items []namedRow, name string) bool {
	for _, item := range items {
		if item.Name == name {
			return true
		}
	}
	return false
}
