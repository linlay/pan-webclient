package httpapi

import (
	"archive/zip"
	"bytes"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"mime/multipart"
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

func TestOnlyCanonicalAPIBaseIsRegistered(t *testing.T) {
	root := t.TempDir()
	handler := newTestHandler(t, root)
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	for _, path := range []string{"/", "/pan/", "/apppan/", "/pan/api/mounts", "/apppan/api/mounts"} {
		rec := authedRequest(handler, cookie, http.MethodGet, path, nil)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("%s expected 404, got %d", path, rec.Code)
		}
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

func TestPreviewAndTaskURLsUseCanonicalAPIBase(t *testing.T) {
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

	previewRec := authedRequest(handler, cookie, http.MethodGet, "/api/preview?mountId=root&path=/note.txt", nil)
	if previewRec.Code != http.StatusOK {
		t.Fatalf("expected preview 200, got %d: %s", previewRec.Code, previewRec.Body.String())
	}
	var meta struct {
		StreamURL string `json:"streamUrl"`
	}
	if err := json.Unmarshal(previewRec.Body.Bytes(), &meta); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(meta.StreamURL, "/api/files/raw?") {
		t.Fatalf("preview streamUrl = %q, want /api/files/raw", meta.StreamURL)
	}

	taskListRec := authedRequest(handler, cookie, http.MethodGet, "/api/tasks", nil)
	if taskListRec.Code != http.StatusOK {
		t.Fatalf("expected task list 200, got %d: %s", taskListRec.Code, taskListRec.Body.String())
	}
	var tasks []indexer.TaskRecord
	if err := json.Unmarshal(taskListRec.Body.Bytes(), &tasks); err != nil {
		t.Fatal(err)
	}
	if len(tasks) != 1 || tasks[0].DownloadURL != "/api/tasks/task-1/download" {
		t.Fatalf("task download url = %+v, want /api/tasks/task-1/download", tasks)
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

func TestPublicShareForFileAllowsPreviewAndDownload(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "hello.txt"), []byte("hello share"), 0o644); err != nil {
		t.Fatal(err)
	}
	handler := newTestHandler(t, root)
	ownerCookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	createBody, _ := json.Marshal(map[string]any{
		"mountId":   "root",
		"path":      "/hello.txt",
		"access":    "public",
		"expiresAt": 0,
	})
	createRec := authedRequest(handler, ownerCookie, http.MethodPost, "/api/shares", createBody)
	if createRec.Code != http.StatusOK {
		t.Fatalf("expected create share 200, got %d: %s", createRec.Code, createRec.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	metaRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID, nil)
	if metaRec.Code != http.StatusOK {
		t.Fatalf("expected public share meta 200, got %d: %s", metaRec.Code, metaRec.Body.String())
	}
	var meta struct {
		Authorized bool `json:"authorized"`
		Preview    struct {
			Name string `json:"name"`
			Path string `json:"path"`
		} `json:"preview"`
	}
	if err := json.Unmarshal(metaRec.Body.Bytes(), &meta); err != nil {
		t.Fatal(err)
	}
	if !meta.Authorized || meta.Preview.Name != "hello.txt" || meta.Preview.Path != "/" {
		t.Fatalf("unexpected share meta: %+v", meta)
	}

	rawRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/raw?path=%2F", nil)
	if rawRec.Code != http.StatusOK {
		t.Fatalf("expected raw 200, got %d: %s", rawRec.Code, rawRec.Body.String())
	}
	if rawRec.Body.String() != "hello share" {
		t.Fatalf("unexpected raw body: %q", rawRec.Body.String())
	}

	downloadRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/download?path=%2F", nil)
	if downloadRec.Code != http.StatusOK {
		t.Fatalf("expected download 200, got %d: %s", downloadRec.Code, downloadRec.Body.String())
	}
	if !strings.Contains(downloadRec.Header().Get("Content-Disposition"), `filename="hello.txt"`) {
		t.Fatalf("expected attachment filename, got %q", downloadRec.Header().Get("Content-Disposition"))
	}
}

func TestPasswordShareRequiresAuthorization(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "secret.txt"), []byte("top secret"), 0o644); err != nil {
		t.Fatal(err)
	}
	handler := newTestHandler(t, root)
	ownerCookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	createBody, _ := json.Marshal(map[string]any{
		"mountId":   "root",
		"path":      "/secret.txt",
		"access":    "password",
		"expiresAt": 0,
	})
	createRec := authedRequest(handler, ownerCookie, http.MethodPost, "/api/shares", createBody)
	if createRec.Code != http.StatusOK {
		t.Fatalf("expected create share 200, got %d: %s", createRec.Code, createRec.Body.String())
	}
	var created struct {
		ID       string `json:"id"`
		Password string `json:"password"`
	}
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if len(created.Password) != 4 {
		t.Fatalf("expected 4-digit password, got %q", created.Password)
	}

	metaRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID, nil)
	if metaRec.Code != http.StatusOK {
		t.Fatalf("expected locked share meta 200, got %d: %s", metaRec.Code, metaRec.Body.String())
	}
	var locked struct {
		Name       string `json:"name"`
		Authorized bool   `json:"authorized"`
	}
	if err := json.Unmarshal(metaRec.Body.Bytes(), &locked); err != nil {
		t.Fatal(err)
	}
	if locked.Authorized || locked.Name != "受保护的分享" {
		t.Fatalf("unexpected locked share payload: %+v", locked)
	}

	rawRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/raw?path=%2F", nil)
	if rawRec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for locked raw access, got %d: %s", rawRec.Code, rawRec.Body.String())
	}

	authBody, _ := json.Marshal(map[string]string{"password": created.Password})
	authRec := requestWithCookies(handler, nil, http.MethodPost, "/api/public/shares/"+created.ID+"/authorize", authBody)
	if authRec.Code != http.StatusOK {
		t.Fatalf("expected authorize 200, got %d: %s", authRec.Code, authRec.Body.String())
	}
	shareCookies := authRec.Result().Cookies()
	if len(shareCookies) == 0 {
		t.Fatal("expected share access cookie")
	}

	unlockedMeta := requestWithCookies(
		handler,
		[]*http.Cookie{shareCookies[0]},
		http.MethodGet,
		"/api/public/shares/"+created.ID,
		nil,
	)
	if unlockedMeta.Code != http.StatusOK {
		t.Fatalf("expected unlocked share meta 200, got %d: %s", unlockedMeta.Code, unlockedMeta.Body.String())
	}
	var unlocked struct {
		Authorized bool `json:"authorized"`
		Preview    struct {
			Name string `json:"name"`
		} `json:"preview"`
	}
	if err := json.Unmarshal(unlockedMeta.Body.Bytes(), &unlocked); err != nil {
		t.Fatal(err)
	}
	if !unlocked.Authorized || unlocked.Preview.Name != "secret.txt" {
		t.Fatalf("unexpected unlocked share payload: %+v", unlocked)
	}
}

func TestDirectoryShareBlocksTraversalAndStreamsZip(t *testing.T) {
	root := t.TempDir()
	sharedDir := filepath.Join(root, "shared")
	if err := os.MkdirAll(sharedDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(sharedDir, "note.txt"), []byte("share note"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "outside.txt"), []byte("outside"), 0o644); err != nil {
		t.Fatal(err)
	}

	handler := newTestHandler(t, root)
	ownerCookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	createBody, _ := json.Marshal(map[string]any{
		"mountId":   "root",
		"path":      "/shared",
		"access":    "public",
		"expiresAt": 0,
	})
	createRec := authedRequest(handler, ownerCookie, http.MethodPost, "/api/shares", createBody)
	if createRec.Code != http.StatusOK {
		t.Fatalf("expected create share 200, got %d: %s", createRec.Code, createRec.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	filesRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/files?path=%2F", nil)
	if filesRec.Code != http.StatusOK {
		t.Fatalf("expected share files 200, got %d: %s", filesRec.Code, filesRec.Body.String())
	}
	var files []namedRow
	if err := json.Unmarshal(filesRec.Body.Bytes(), &files); err != nil {
		t.Fatal(err)
	}
	if len(files) != 1 || files[0].Name != "note.txt" {
		t.Fatalf("unexpected directory share files: %+v", files)
	}

	traversalRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/files?path=%2F..%2F..", nil)
	if traversalRec.Code != http.StatusBadRequest {
		t.Fatalf("expected traversal 400, got %d: %s", traversalRec.Code, traversalRec.Body.String())
	}

	zipRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/download?path=%2F", nil)
	if zipRec.Code != http.StatusOK {
		t.Fatalf("expected directory zip 200, got %d: %s", zipRec.Code, zipRec.Body.String())
	}
	reader, err := zip.NewReader(bytes.NewReader(zipRec.Body.Bytes()), int64(zipRec.Body.Len()))
	if err != nil {
		t.Fatalf("expected zip response, got %v", err)
	}
	if len(reader.File) != 1 || reader.File[0].Name != "shared/note.txt" {
		names := make([]string, 0, len(reader.File))
		for _, file := range reader.File {
			names = append(names, file.Name)
		}
		t.Fatalf("unexpected zip entries: %+v", names)
	}
}

func TestPublicShareSaveRequiresLoginAndCopiesIntoTargetMount(t *testing.T) {
	sourceRoot := t.TempDir()
	targetRoot := t.TempDir()
	sharedDir := filepath.Join(sourceRoot, "shared")
	if err := os.MkdirAll(sharedDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(sharedDir, "note.txt"), []byte("share note"), 0o644); err != nil {
		t.Fatal(err)
	}

	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	handler := newHandlerWithMounts(store, []mounts.Mount{
		{ID: "root", Name: "Root", Path: sourceRoot},
		{ID: "dest", Name: "Destination", Path: targetRoot},
	})
	ownerCookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	createBody, _ := json.Marshal(map[string]any{
		"mountId":   "root",
		"path":      "/shared",
		"access":    "public",
		"expiresAt": 0,
	})
	createRec := authedRequest(handler, ownerCookie, http.MethodPost, "/api/shares", createBody)
	if createRec.Code != http.StatusOK {
		t.Fatalf("expected create share 200, got %d: %s", createRec.Code, createRec.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	saveBody, _ := json.Marshal(map[string]any{
		"mountId":   "dest",
		"targetDir": "/",
		"path":      "/",
	})
	unauthorizedSave := requestWithCookies(
		handler,
		nil,
		http.MethodPost,
		"/api/public/shares/"+created.ID+"/save",
		saveBody,
	)
	if unauthorizedSave.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthenticated save 401, got %d: %s", unauthorizedSave.Code, unauthorizedSave.Body.String())
	}

	saveRec := requestWithCookies(
		handler,
		[]*http.Cookie{ownerCookie},
		http.MethodPost,
		"/api/public/shares/"+created.ID+"/save",
		saveBody,
	)
	if saveRec.Code != http.StatusOK {
		t.Fatalf("expected authenticated save 200, got %d: %s", saveRec.Code, saveRec.Body.String())
	}
	if _, err := os.Stat(filepath.Join(targetRoot, "shared", "note.txt")); err != nil {
		t.Fatalf("expected shared directory copied into destination mount, got %v", err)
	}
}

func TestWriteShareRejectsFileCreation(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "hello.txt"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	handler := newTestHandler(t, root)
	ownerCookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	createBody, _ := json.Marshal(map[string]any{
		"mountId":    "root",
		"path":       "/hello.txt",
		"access":     "public",
		"permission": "write",
		"expiresAt":  0,
	})
	createRec := authedRequest(handler, ownerCookie, http.MethodPost, "/api/shares", createBody)
	if createRec.Code != http.StatusBadRequest {
		t.Fatalf("expected create share 400, got %d: %s", createRec.Code, createRec.Body.String())
	}
}

func TestWriteShareAllowsUploadButBlocksReadOperations(t *testing.T) {
	sourceRoot := t.TempDir()
	targetRoot := t.TempDir()
	sharedDir := filepath.Join(sourceRoot, "drop")
	if err := os.MkdirAll(filepath.Join(sharedDir, "nested"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(sharedDir, "existing.txt"), []byte("existing"), 0o644); err != nil {
		t.Fatal(err)
	}

	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	handler := newHandlerWithMounts(store, []mounts.Mount{
		{ID: "root", Name: "Root", Path: sourceRoot},
		{ID: "dest", Name: "Destination", Path: targetRoot},
	})
	ownerCookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	createBody, _ := json.Marshal(map[string]any{
		"mountId":    "root",
		"path":       "/drop",
		"access":     "public",
		"permission": "write",
		"expiresAt":  0,
	})
	createRec := authedRequest(handler, ownerCookie, http.MethodPost, "/api/shares", createBody)
	if createRec.Code != http.StatusOK {
		t.Fatalf("expected create share 200, got %d: %s", createRec.Code, createRec.Body.String())
	}
	var created struct {
		ID         string `json:"id"`
		Permission string `json:"permission"`
	}
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Permission != "write" {
		t.Fatalf("expected write permission, got %+v", created)
	}

	metaRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID, nil)
	if metaRec.Code != http.StatusOK {
		t.Fatalf("expected public share meta 200, got %d: %s", metaRec.Code, metaRec.Body.String())
	}
	var meta struct {
		Permission string `json:"permission"`
		Preview    struct {
			Kind string `json:"kind"`
		} `json:"preview"`
	}
	if err := json.Unmarshal(metaRec.Body.Bytes(), &meta); err != nil {
		t.Fatal(err)
	}
	if meta.Permission != "write" || meta.Preview.Kind != "directory" {
		t.Fatalf("unexpected write share meta: %+v", meta)
	}

	uploadRec := multipartRequestWithCookies(
		t,
		handler,
		nil,
		http.MethodPost,
		"/api/public/shares/"+created.ID+"/uploads",
		map[string]string{"path": "/nested"},
		[]multipartUploadFile{{name: "incoming.txt", content: []byte("uploaded")}},
	)
	if uploadRec.Code != http.StatusOK {
		t.Fatalf("expected upload 200, got %d: %s", uploadRec.Code, uploadRec.Body.String())
	}
	if _, err := os.Stat(filepath.Join(sharedDir, "nested", "incoming.txt")); err != nil {
		t.Fatalf("expected uploaded file inside shared directory, got %v", err)
	}

	filesRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/files?path=%2Fnested", nil)
	if filesRec.Code != http.StatusOK {
		t.Fatalf("expected directory listing 200, got %d: %s", filesRec.Code, filesRec.Body.String())
	}

	previewRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/preview?path=%2Fexisting.txt", nil)
	if previewRec.Code != http.StatusForbidden {
		t.Fatalf("expected file preview 403, got %d: %s", previewRec.Code, previewRec.Body.String())
	}

	downloadRec := requestWithCookies(handler, nil, http.MethodGet, "/api/public/shares/"+created.ID+"/download?path=%2Fexisting.txt", nil)
	if downloadRec.Code != http.StatusForbidden {
		t.Fatalf("expected file download 403, got %d: %s", downloadRec.Code, downloadRec.Body.String())
	}

	saveBody, _ := json.Marshal(map[string]any{
		"mountId":   "dest",
		"targetDir": "/",
		"path":      "/",
	})
	saveRec := requestWithCookies(
		handler,
		[]*http.Cookie{ownerCookie},
		http.MethodPost,
		"/api/public/shares/"+created.ID+"/save",
		saveBody,
	)
	if saveRec.Code != http.StatusForbidden {
		t.Fatalf("expected save 403, got %d: %s", saveRec.Code, saveRec.Body.String())
	}
}

func TestPasswordWriteShareUploadRequiresAuthorization(t *testing.T) {
	root := t.TempDir()
	sharedDir := filepath.Join(root, "drop")
	if err := os.MkdirAll(sharedDir, 0o755); err != nil {
		t.Fatal(err)
	}
	handler := newTestHandler(t, root)
	ownerCookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	createBody, _ := json.Marshal(map[string]any{
		"mountId":    "root",
		"path":       "/drop",
		"access":     "password",
		"permission": "write",
		"expiresAt":  0,
	})
	createRec := authedRequest(handler, ownerCookie, http.MethodPost, "/api/shares", createBody)
	if createRec.Code != http.StatusOK {
		t.Fatalf("expected create share 200, got %d: %s", createRec.Code, createRec.Body.String())
	}
	var created struct {
		ID       string `json:"id"`
		Password string `json:"password"`
	}
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	unauthorizedUpload := multipartRequestWithCookies(
		t,
		handler,
		nil,
		http.MethodPost,
		"/api/public/shares/"+created.ID+"/uploads",
		map[string]string{"path": "/"},
		[]multipartUploadFile{{name: "blocked.txt", content: []byte("blocked")}},
	)
	if unauthorizedUpload.Code != http.StatusUnauthorized {
		t.Fatalf("expected upload 401 before password auth, got %d: %s", unauthorizedUpload.Code, unauthorizedUpload.Body.String())
	}

	authBody, _ := json.Marshal(map[string]string{"password": created.Password})
	authRec := requestWithCookies(handler, nil, http.MethodPost, "/api/public/shares/"+created.ID+"/authorize", authBody)
	if authRec.Code != http.StatusOK {
		t.Fatalf("expected authorize 200, got %d: %s", authRec.Code, authRec.Body.String())
	}
	shareCookies := authRec.Result().Cookies()
	if len(shareCookies) == 0 {
		t.Fatal("expected share access cookie")
	}

	uploadRec := multipartRequestWithCookies(
		t,
		handler,
		[]*http.Cookie{shareCookies[0]},
		http.MethodPost,
		"/api/public/shares/"+created.ID+"/uploads",
		map[string]string{"path": "/"},
		[]multipartUploadFile{{name: "allowed.txt", content: []byte("allowed")}},
	)
	if uploadRec.Code != http.StatusOK {
		t.Fatalf("expected upload 200 after password auth, got %d: %s", uploadRec.Code, uploadRec.Body.String())
	}
	if _, err := os.Stat(filepath.Join(sharedDir, "allowed.txt")); err != nil {
		t.Fatalf("expected uploaded file after authorization, got %v", err)
	}
}

func TestUploadsRejectRequestsLargerThanConfiguredLimit(t *testing.T) {
	root := t.TempDir()
	store := indexer.NewStore(t.TempDir())
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	handler := newHandlerWithConfig(root, store, config.Config{
		SessionCookieName: "pan_session",
		SessionSecret:     "secret",
		AdminUsername:     "admin",
		AdminPasswordHash: routerTestPasswordHash,
		MaxUploadBytes:    4,
		MaxEditFileBytes:  1024 * 1024,
	})
	cookie := issueTestSession(t, auth.NewManager("secret", nil, "admin", routerTestPasswordHash))

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("mountId", "root"); err != nil {
		t.Fatal(err)
	}
	if err := writer.WriteField("path", "/"); err != nil {
		t.Fatal(err)
	}
	part, err := writer.CreateFormFile("files", "large.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte("hello")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/uploads", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.AddCookie(cookie)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["code"] != "UPLOAD_TOO_LARGE" {
		t.Fatalf("unexpected error payload: %+v", payload)
	}
	if _, err := os.Stat(filepath.Join(root, "large.txt")); !os.IsNotExist(err) {
		t.Fatalf("expected oversized upload to be rejected before writing file, got %v", err)
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
	return newHandlerWithMountsAndConfig(store, []mounts.Mount{{ID: "root", Name: "Root", Path: root}}, config.Config{
		SessionCookieName: "pan_session",
		SessionSecret:     "secret",
		AdminUsername:     "admin",
		AdminPasswordHash: routerTestPasswordHash,
		MaxEditFileBytes:  1024 * 1024,
	})
}

func newHandlerWithConfig(root string, store *indexer.Store, cfg config.Config) http.Handler {
	return newHandlerWithMountsAndConfig(store, []mounts.Mount{{ID: "root", Name: "Root", Path: root}}, cfg)
}

func newHandlerWithMounts(store *indexer.Store, mountsList []mounts.Mount) http.Handler {
	return newHandlerWithMountsAndConfig(store, mountsList, config.Config{
		SessionCookieName: "pan_session",
		SessionSecret:     "secret",
		AdminUsername:     "admin",
		AdminPasswordHash: routerTestPasswordHash,
		MaxEditFileBytes:  1024 * 1024,
	})
}

func newHandlerWithMountsAndConfig(store *indexer.Store, mountsList []mounts.Mount, cfg config.Config) http.Handler {
	if cfg.MaxUploadBytes <= 0 {
		cfg.MaxUploadBytes = 100 * 1024 * 1024
	}
	manager := auth.NewManager(cfg.SessionSecret, nil, cfg.AdminUsername, cfg.AdminPasswordHash)
	return New(Dependencies{
		Config:      cfg,
		Resolver:    fsops.NewMountResolver(mountsList),
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
	return requestWithCookies(handler, []*http.Cookie{cookie}, method, path, body)
}

func requestWithCookies(handler http.Handler, cookies []*http.Cookie, method, path string, body []byte) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	for _, cookie := range cookies {
		if cookie != nil {
			req.AddCookie(cookie)
		}
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

type multipartUploadFile struct {
	name    string
	content []byte
}

func multipartRequestWithCookies(
	t *testing.T,
	handler http.Handler,
	cookies []*http.Cookie,
	method string,
	path string,
	fields map[string]string,
	files []multipartUploadFile,
) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatal(err)
		}
	}
	for _, file := range files {
		part, err := writer.CreateFormFile("files", file.name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := part.Write(file.content); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(method, path, &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	for _, cookie := range cookies {
		if cookie != nil {
			req.AddCookie(cookie)
		}
	}
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
