package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"pan-webclient/backend/internal/auth"
	"pan-webclient/backend/internal/config"
	"pan-webclient/backend/internal/editor"
	"pan-webclient/backend/internal/fsops"
	"pan-webclient/backend/internal/indexer"
	"pan-webclient/backend/internal/preview"
	"pan-webclient/backend/internal/transfer"
	"pan-webclient/backend/internal/trash"
)

type Dependencies struct {
	Config      config.Config
	Resolver    *fsops.MountResolver
	Store       *indexer.Store
	Auth        *auth.Manager
	TaskManager *transfer.Manager
}

type api struct {
	cfg         config.Config
	resolver    *fsops.MountResolver
	store       *indexer.Store
	auth        *auth.Manager
	taskManager *transfer.Manager
	static      http.Handler
}

func New(deps Dependencies) http.Handler {
	a := &api{
		cfg:         deps.Config,
		resolver:    deps.Resolver,
		store:       deps.Store,
		auth:        deps.Auth,
		taskManager: deps.TaskManager,
	}
	if deps.Config.StaticDir != "" {
		a.static = spaHandler(deps.Config.StaticDir)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", a.health)
	mux.HandleFunc("/api/web/session/login", a.webLogin)
	mux.HandleFunc("/api/web/session/logout", a.webLogout)
	mux.HandleFunc("/api/web/session/me", a.withAuth(a.sessionMe))
	mux.HandleFunc("/api/mounts", a.withAuth(a.mounts))
	mux.HandleFunc("/api/tree", a.withAuth(a.tree))
	mux.HandleFunc("/api/files", a.withAuth(a.files))
	mux.HandleFunc("/api/search", a.withAuth(a.search))
	mux.HandleFunc("/api/files/folder", a.withAuth(a.mkdir))
	mux.HandleFunc("/api/files/copy", a.withAuth(a.copy))
	mux.HandleFunc("/api/files/move", a.withAuth(a.move))
	mux.HandleFunc("/api/files/rename", a.withAuth(a.rename))
	mux.HandleFunc("/api/files/delete", a.withAuth(a.remove))
	mux.HandleFunc("/api/preview", a.withAuth(a.preview))
	mux.HandleFunc("/api/files/content", a.withAuth(a.fileContent))
	mux.HandleFunc("/api/files/raw", a.withAuth(a.raw))
	mux.HandleFunc("/api/uploads", a.withAuth(a.uploads))
	mux.HandleFunc("/api/tasks", a.withAuth(a.tasks))
	mux.HandleFunc("/api/downloads/batch", a.withAuth(a.batchDownload))
	mux.HandleFunc("/api/tasks/", a.withAuth(a.taskRoute))
	mux.HandleFunc("/api/trash", a.withAuth(a.trash))
	mux.HandleFunc("/api/trash/restore", a.withAuth(a.restoreTrash))
	mux.HandleFunc("/api/trash/delete", a.withAuth(a.deleteTrash))

	return a.wrap(mux)
}

func (a *api) wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := a.applyCORS(w, r); err {
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}
		if a.static != nil {
			a.static.ServeHTTP(w, r)
			return
		}
		http.NotFound(w, r)
	})
}

func (a *api) applyCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin != "" && a.cfg.WebOrigin != "" && origin == a.cfg.WebOrigin {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
	}
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}

func (a *api) withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := a.authenticate(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", err.Error())
			return
		}
		next(w, r.WithContext(auth.WithUser(r.Context(), user)))
	}
}

func (a *api) authenticate(r *http.Request) (auth.SessionUser, error) {
	if cookie, err := r.Cookie(a.cfg.SessionCookieName); err == nil && cookie.Value != "" {
		claims, err := a.auth.VerifySession(cookie.Value)
		if err == nil {
			return auth.SessionUser{Username: claims.Sub, AuthMethod: "session"}, nil
		}
	}
	if token := auth.BearerToken(r); token != "" {
		claims, err := a.auth.VerifyAccessToken(token)
		if err == nil {
			return auth.SessionUser{Username: claims.Sub, AuthMethod: "token"}, nil
		}
	}
	return auth.SessionUser{}, errors.New("missing or invalid credentials")
}

func (a *api) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *api) webLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid json body")
		return
	}
	if !a.auth.CheckCredentials(req.Username, req.Password) {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid username or password")
		return
	}
	token, err := a.auth.IssueSession(req.Username, 24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "TOKEN_ERROR", err.Error())
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     a.cfg.SessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   24 * 60 * 60,
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"username":   req.Username,
		"authMethod": "session",
	})
}

func (a *api) webLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     a.cfg.SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *api) sessionMe(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.UserFromContext(r.Context())
	writeJSON(w, http.StatusOK, user)
}

func (a *api) mounts(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, a.resolver.Mounts())
}

func (a *api) tree(w http.ResponseWriter, r *http.Request) {
	mountID, path := requirePathQuery(w, r)
	if mountID == "" {
		return
	}
	nodes, err := fsops.Tree(a.resolver, mountID, path, queryShowHidden(r))
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, nodes)
}

func (a *api) files(w http.ResponseWriter, r *http.Request) {
	mountID, path := requirePathQuery(w, r)
	if mountID == "" {
		return
	}
	entries, err := fsops.ListDirectory(a.resolver, mountID, path, queryShowHidden(r))
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (a *api) search(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		writeJSON(w, http.StatusOK, []indexer.SearchHit{})
		return
	}
	hits, err := indexer.SearchMounts(a.resolver.Mounts(), query, 100, queryShowHidden(r))
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, hits)
}

func (a *api) mkdir(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req struct {
		MountID string `json:"mountId"`
		Path    string `json:"path"`
		Name    string `json:"name"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	entry, err := fsops.Mkdir(a.resolver, req.MountID, req.Path, req.Name)
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (a *api) copy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req struct {
		MountID   string `json:"mountId"`
		Path      string `json:"path"`
		TargetDir string `json:"targetDir"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	entry, err := fsops.Copy(a.resolver, req.MountID, req.Path, req.TargetDir)
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (a *api) move(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req struct {
		MountID   string `json:"mountId"`
		Path      string `json:"path"`
		TargetDir string `json:"targetDir"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	entry, err := fsops.Move(a.resolver, req.MountID, req.Path, req.TargetDir)
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (a *api) rename(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req struct {
		MountID string `json:"mountId"`
		Path    string `json:"path"`
		NewName string `json:"newName"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	entry, err := fsops.Rename(a.resolver, req.MountID, req.Path, req.NewName)
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (a *api) remove(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req struct {
		MountID string `json:"mountId"`
		Path    string `json:"path"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	record, err := trash.MoveToTrash(a.resolver, req.MountID, req.Path, a.store.TrashItemsDir())
	if err != nil {
		writeServerError(w, err)
		return
	}
	if err := a.store.PutTrash(indexer.TrashRecord{
		ID:           record.ID,
		MountID:      record.MountID,
		OriginalPath: record.Original,
		TrashPath:    record.TrashPath,
		DeletedAt:    record.DeletedAt,
		IsDir:        record.IsDir,
		Size:         record.Size,
		Name:         record.Name,
	}); err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *api) preview(w http.ResponseWriter, r *http.Request) {
	mountID, path := requirePathQuery(w, r)
	if mountID == "" {
		return
	}
	rawURL := "/api/files/raw?mountId=" + url.QueryEscape(mountID) + "&path=" + url.QueryEscape(path)
	meta, err := preview.Build(a.resolver, mountID, path, rawURL, a.cfg.MaxEditFileBytes)
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, meta)
}

func (a *api) fileContent(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		mountID, path := requirePathQuery(w, r)
		if mountID == "" {
			return
		}
		doc, err := editor.Load(a.resolver, mountID, path, a.cfg.MaxEditFileBytes)
		if err != nil {
			writeServerError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, doc)
	case http.MethodPut:
		var req struct {
			MountID string `json:"mountId"`
			Path    string `json:"path"`
			Content string `json:"content"`
			Version string `json:"version"`
		}
		if !decodeJSON(w, r, &req) {
			return
		}
		doc, err := editor.Save(a.resolver, req.MountID, req.Path, req.Content, req.Version)
		if err != nil {
			if strings.Contains(err.Error(), "version conflict") {
				writeError(w, http.StatusConflict, "VERSION_CONFLICT", err.Error())
				return
			}
			writeServerError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, doc)
	default:
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
	}
}

func (a *api) raw(w http.ResponseWriter, r *http.Request) {
	mountID, path := requirePathQuery(w, r)
	if mountID == "" {
		return
	}
	file, info, err := fsops.OpenFile(a.resolver, mountID, path)
	if err != nil {
		writeServerError(w, err)
		return
	}
	defer file.Close()
	if info.IsDir() {
		writeError(w, http.StatusBadRequest, "NOT_A_FILE", "path is a directory")
		return
	}
	contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(path)))
	if contentType == "" {
		buffer := make([]byte, 512)
		n, _ := file.Read(buffer)
		contentType = http.DetectContentType(buffer[:n])
		_, _ = file.Seek(0, io.SeekStart)
	}
	w.Header().Set("Content-Type", contentType)
	http.ServeContent(w, r, filepath.Base(path), info.ModTime(), file)
}

func (a *api) uploads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	if err := r.ParseMultipartForm(a.cfg.MaxUploadBytes); err != nil {
		writeError(w, http.StatusBadRequest, "UPLOAD_PARSE_FAILED", err.Error())
		return
	}
	task := transfer.NewTask("upload", "Uploading files")
	task.Status = "running"
	task.UpdatedAt = time.Now().Unix()
	_ = a.taskManager.Put(task, "")

	mountID := r.FormValue("mountId")
	relPath := r.FormValue("path")
	uploaded := 0
	files := r.MultipartForm.File["files"]
	for _, header := range files {
		src, err := header.Open()
		if err != nil {
			continue
		}
		_, err = fsops.SaveUploadedFile(a.resolver, mountID, relPath, header.Filename, src)
		_ = src.Close()
		if err == nil {
			uploaded++
		}
	}

	task.Status = "success"
	task.Detail = fmt.Sprintf("Uploaded %d files", uploaded)
	task.UpdatedAt = time.Now().Unix()
	_ = a.taskManager.Put(task, "")
	writeJSON(w, http.StatusOK, task)
}

func (a *api) tasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	items, err := a.taskManager.List(100)
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *api) batchDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req struct {
		MountID     string   `json:"mountId"`
		Items       []string `json:"items"`
		ArchiveName string   `json:"archiveName"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	task, err := a.taskManager.StartZipTask(a.resolver, req.MountID, req.Items, req.ArchiveName)
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, task)
}

func (a *api) taskRoute(w http.ResponseWriter, r *http.Request) {
	trimmed := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	parts := strings.Split(strings.Trim(trimmed, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "task not found")
		return
	}
	id := parts[0]
	task, artifact, err := a.taskManager.Get(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "TASK_NOT_FOUND", "task not found")
		return
	}
	if len(parts) == 2 && parts[1] == "download" {
		if task.Status != "success" || artifact == "" {
			writeError(w, http.StatusConflict, "TASK_NOT_READY", "download artifact not ready")
			return
		}
		http.ServeFile(w, r, artifact)
		return
	}
	writeJSON(w, http.StatusOK, task)
}

func (a *api) trash(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	items, err := a.store.ListTrash(100)
	if err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *api) restoreTrash(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	ids, ok := decodeIDs(w, r)
	if !ok {
		return
	}

	restored := 0
	conflicts := make([]string, 0)
	for _, id := range ids {
		record, err := a.store.GetTrash(id)
		if err != nil {
			conflicts = append(conflicts, id)
			continue
		}
		_, targetAbs, _, err := a.resolver.Resolve(record.MountID, record.OriginalPath)
		if err != nil {
			conflicts = append(conflicts, id)
			continue
		}
		if _, err := os.Stat(targetAbs); err == nil {
			conflicts = append(conflicts, record.Name)
			continue
		} else if !os.IsNotExist(err) {
			conflicts = append(conflicts, record.Name)
			continue
		}
		if err := os.MkdirAll(filepath.Dir(targetAbs), 0o755); err != nil {
			conflicts = append(conflicts, record.Name)
			continue
		}
		if err := os.Rename(record.TrashPath, targetAbs); err != nil {
			conflicts = append(conflicts, record.Name)
			continue
		}
		if err := a.store.DeleteTrashRecord(id); err != nil {
			conflicts = append(conflicts, record.Name)
			continue
		}
		restored++
	}
	status := http.StatusOK
	if len(conflicts) > 0 {
		status = http.StatusConflict
	}
	writeJSON(w, status, map[string]any{
		"restored":  restored,
		"conflicts": conflicts,
	})
}

func (a *api) deleteTrash(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	ids, ok := decodeIDs(w, r)
	if !ok {
		return
	}

	deleted := 0
	missing := make([]string, 0)
	for _, id := range ids {
		record, err := a.store.GetTrash(id)
		if err != nil {
			missing = append(missing, id)
			continue
		}
		if err := os.RemoveAll(record.TrashPath); err != nil {
			missing = append(missing, record.Name)
			continue
		}
		if err := a.store.DeleteTrashRecord(id); err != nil {
			missing = append(missing, record.Name)
			continue
		}
		deleted++
	}
	status := http.StatusOK
	if len(missing) > 0 {
		status = http.StatusConflict
	}
	writeJSON(w, status, map[string]any{
		"deleted": deleted,
		"missing": missing,
	})
}

func requirePathQuery(w http.ResponseWriter, r *http.Request) (string, string) {
	mountID := strings.TrimSpace(r.URL.Query().Get("mountId"))
	path := r.URL.Query().Get("path")
	if mountID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_MOUNT", "mountId is required")
		return "", ""
	}
	if path == "" {
		path = "/"
	}
	return mountID, path
}

func queryShowHidden(r *http.Request) bool {
	switch strings.ToLower(strings.TrimSpace(r.URL.Query().Get("showHidden"))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func writeServerError(w http.ResponseWriter, err error) {
	switch {
	case os.IsNotExist(err):
		writeError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case os.IsPermission(err):
		writeError(w, http.StatusForbidden, "FORBIDDEN", err.Error())
	case strings.Contains(err.Error(), "path escapes mount root"):
		writeError(w, http.StatusBadRequest, "INVALID_PATH", err.Error())
	default:
		writeError(w, http.StatusBadRequest, "REQUEST_FAILED", err.Error())
	}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid json body")
		return false
	}
	return true
}

func decodeIDs(w http.ResponseWriter, r *http.Request) ([]string, bool) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if !decodeJSON(w, r, &req) {
		return nil, false
	}
	if len(req.IDs) == 0 {
		writeError(w, http.StatusBadRequest, "BAD_REQUEST", "ids is required")
		return nil, false
	}
	return req.IDs, true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]string{
		"code":    code,
		"message": message,
	})
}

func spaHandler(dir string) http.Handler {
	fileServer := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestPath := filepath.Clean(r.URL.Path)
		if requestPath == "/" {
			http.ServeFile(w, r, filepath.Join(dir, "index.html"))
			return
		}
		abs := filepath.Join(dir, strings.TrimPrefix(requestPath, "/"))
		if info, err := os.Stat(abs); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(dir, "index.html"))
	})
}

func userFromContext(ctx context.Context) string {
	if user, ok := auth.UserFromContext(ctx); ok {
		return user.Username
	}
	return ""
}

func parseInt(v string, fallback int64) int64 {
	parsed, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}
