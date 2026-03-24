package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
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

const (
	canonicalAPIBase                 = "/api"
	webAPIBase                       = "/pan/api"
	appAPIBase                       = "/apppan/api"
	uploadParseMemoryBytes     int64 = 32 << 20
	uploadRequestOverheadBytes int64 = 32 << 20
	uploadFieldMaxBytes        int64 = 1 << 20
	uploadTaskIDHeader               = "X-Upload-Task-ID"
	uploadTotalBytesHeader           = "X-Upload-Total-Bytes"
	uploadItemCountHeader            = "X-Upload-Item-Count"
	uploadTaskIDMaxLen               = 80
	uploadTaskPersistInterval        = 250 * time.Millisecond
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
}

func New(deps Dependencies) http.Handler {
	a := &api{
		cfg:         deps.Config,
		resolver:    deps.Resolver,
		store:       deps.Store,
		auth:        deps.Auth,
		taskManager: deps.TaskManager,
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
	mux.HandleFunc("/api/shares", a.withAuth(a.shares))
	mux.HandleFunc("/api/shares/", a.withAuth(a.shareRoute))
	mux.HandleFunc("/api/uploads/task", a.withAuth(a.createUploadTask))
	mux.HandleFunc("/api/uploads", a.withAuth(a.uploads))
	mux.HandleFunc("/api/tasks", a.withAuth(a.tasks))
	mux.HandleFunc("/api/downloads/batch", a.withAuth(a.batchDownload))
	mux.HandleFunc("/api/tasks/", a.withAuth(a.taskRoute))
	mux.HandleFunc("/api/trash", a.withAuth(a.trash))
	mux.HandleFunc("/api/trash/restore", a.withAuth(a.restoreTrash))
	mux.HandleFunc("/api/trash/delete", a.withAuth(a.deleteTrash))
	mux.HandleFunc("/api/public/shares/", a.publicShareRoute)

	return mux
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
	writeJSON(w, http.StatusOK, map[string]any{
		"status":         "ok",
		"maxUploadBytes": a.cfg.MaxUploadBytes,
	})
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
	rawURL := apiURL(
		"/files/raw?mountId=" + url.QueryEscape(mountID) + "&path=" + url.QueryEscape(path),
	)
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

	taskID, err := requestedUploadTaskID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "UPLOAD_TASK_INVALID", err.Error())
		return
	}
	if taskID == "" {
		a.uploadsBuffered(w, r)
		return
	}

	a.uploadsStreaming(w, r, taskID)
}

func (a *api) createUploadTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req struct {
		Items []struct {
			Name string `json:"name"`
			Size int64  `json:"size"`
		} `json:"items"`
		TotalBytes int64 `json:"totalBytes"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if len(req.Items) == 0 {
		writeError(w, http.StatusBadRequest, "UPLOAD_EMPTY", "files is required")
		return
	}

	task := transfer.NewTask("upload", "Uploading files")
	task.Status = "pending"
	task.Items = make([]transfer.TaskItem, 0, len(req.Items))
	var totalBytes int64
	for _, item := range req.Items {
		name := filepath.Base(strings.TrimSpace(item.Name))
		if name == "." || name == "/" || name == "" {
			name = "file"
		}
		size := item.Size
		if size < 0 {
			size = 0
		}
		totalBytes += size
		task.Items = append(task.Items, transfer.TaskItem{
			Name:  name,
			Path:  name,
			Size:  size,
			IsDir: false,
		})
	}
	if totalBytes <= 0 && req.TotalBytes > 0 {
		totalBytes = req.TotalBytes
	}
	if totalBytes > a.cfg.MaxUploadBytes {
		writeError(
			w,
			http.StatusRequestEntityTooLarge,
			"UPLOAD_TOO_LARGE",
			uploadTooLargeMessage(a.cfg.MaxUploadBytes),
		)
		return
	}
	task.TotalBytes = totalBytes
	task.UpdatedAt = time.Now().Unix()
	if err := a.taskManager.Put(task, ""); err != nil {
		writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, task)
}

func (a *api) uploadsBuffered(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.MaxUploadBytes+uploadRequestOverheadBytes)
	if err := r.ParseMultipartForm(uploadParseMemoryBytes); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(
				w,
				http.StatusRequestEntityTooLarge,
				"UPLOAD_TOO_LARGE",
				uploadTooLargeMessage(a.cfg.MaxUploadBytes),
			)
			return
		}
		writeError(w, http.StatusBadRequest, "UPLOAD_PARSE_FAILED", err.Error())
		return
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	files := r.MultipartForm.File["files"]
	if totalUploadBytes(files) > a.cfg.MaxUploadBytes {
		writeError(
			w,
			http.StatusRequestEntityTooLarge,
			"UPLOAD_TOO_LARGE",
			uploadTooLargeMessage(a.cfg.MaxUploadBytes),
		)
		return
	}

	task := transfer.NewTask("upload", "Uploading files")
	task.Status = "running"
	task.Items = make([]transfer.TaskItem, 0, len(files))
	for _, header := range files {
		task.Items = append(task.Items, transfer.TaskItem{
			Name:  header.Filename,
			Path:  header.Filename,
			Size:  header.Size,
			IsDir: false,
		})
		task.TotalBytes += header.Size
	}
	task.UpdatedAt = time.Now().Unix()
	_ = a.taskManager.Put(task, "")

	mountID := r.FormValue("mountId")
	relPath := r.FormValue("path")
	uploaded := 0
	for _, header := range files {
		src, err := header.Open()
		if err != nil {
			continue
		}
		_, written, err := fsops.SaveUploadedFile(a.resolver, mountID, relPath, header.Filename, src)
		_ = src.Close()
		if err == nil {
			uploaded++
			task.CompletedBytes += written
			task.Detail = fmt.Sprintf("Uploaded %d/%d files", uploaded, len(files))
			task.UpdatedAt = time.Now().Unix()
			_ = a.taskManager.Put(task, "")
		}
	}

	if uploaded == len(files) {
		task.Status = "success"
		task.Detail = fmt.Sprintf("Uploaded %d/%d files", uploaded, len(files))
		task.CompletedBytes = task.TotalBytes
	} else {
		task.Status = "partial"
		task.Detail = fmt.Sprintf("Uploaded %d/%d files", uploaded, len(files))
	}
	task.UpdatedAt = time.Now().Unix()
	_ = a.taskManager.Put(task, "")
	writeJSON(w, http.StatusOK, task)
}

func (a *api) uploadsStreaming(w http.ResponseWriter, r *http.Request, taskID string) {
	claimedTotalBytes := requestedUploadTotalBytes(r)
	task, _, err := a.taskManager.Get(taskID)
	if err != nil {
		task = transfer.NewTask("upload", "Uploading files")
		task.ID = taskID
	}
	task.Kind = "upload"
	task.Status = "running"
	task.Detail = "Uploading files"
	if claimedTotalBytes > 0 {
		task.TotalBytes = claimedTotalBytes
	}
	task.UpdatedAt = time.Now().Unix()
	_ = a.taskManager.Put(task, "")
	if claimedTotalBytes > a.cfg.MaxUploadBytes {
		a.failUploadTask(
			task,
			"UPLOAD_TOO_LARGE",
			uploadTooLargeMessage(a.cfg.MaxUploadBytes),
			w,
			http.StatusRequestEntityTooLarge,
		)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.MaxUploadBytes+uploadRequestOverheadBytes)
	reader, err := r.MultipartReader()
	if err != nil {
		a.failUploadTask(task, "UPLOAD_PARSE_FAILED", err.Error(), w, http.StatusBadRequest)
		return
	}

	mountID := ""
	relPath := "/"
	expectedFiles := requestedUploadItemCount(r)
	remainingFileBytes := a.cfg.MaxUploadBytes
	uploaded := 0
	filesSeen := 0
	lastPersist := time.Now()
	persistTask := func(force bool) {
		if !force && time.Since(lastPersist) < uploadTaskPersistInterval {
			return
		}
		task.UpdatedAt = time.Now().Unix()
		_ = a.taskManager.Put(task, "")
		lastPersist = time.Now()
	}

	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			var maxBytesErr *http.MaxBytesError
			if errors.As(err, &maxBytesErr) {
				a.failUploadTask(
					task,
					"UPLOAD_TOO_LARGE",
					uploadTooLargeMessage(a.cfg.MaxUploadBytes),
					w,
					http.StatusRequestEntityTooLarge,
				)
				return
			}
			if isRecoverableMultipartEOF(err, expectedFiles, filesSeen, uploaded) {
				break
			}
			a.failUploadTask(task, "UPLOAD_PARSE_FAILED", err.Error(), w, http.StatusBadRequest)
			return
		}
		if part.FileName() == "" {
			value, err := readMultipartFieldValue(part, uploadFieldMaxBytes)
			_ = part.Close()
			if err != nil {
				a.failUploadTask(task, "UPLOAD_PARSE_FAILED", err.Error(), w, http.StatusBadRequest)
				return
			}
			switch part.FormName() {
			case "mountId":
				mountID = strings.TrimSpace(value)
			case "path":
				if value != "" {
					relPath = value
				}
			}
			continue
		}
		if part.FormName() != "files" {
			_, _ = io.Copy(io.Discard, part)
			_ = part.Close()
			continue
		}
		if strings.TrimSpace(mountID) == "" {
			_, _ = io.Copy(io.Discard, part)
			_ = part.Close()
			a.failUploadTask(
				task,
				"UPLOAD_PARSE_FAILED",
				"mountId is required before files",
				w,
				http.StatusBadRequest,
			)
			return
		}

		filesSeen++
		itemIndex := filesSeen - 1
		expectedItemSize := int64(0)
		if itemIndex < len(task.Items) {
			task.Items[itemIndex].Name = part.FileName()
			task.Items[itemIndex].Path = part.FileName()
			task.Items[itemIndex].IsDir = false
			if task.Items[itemIndex].Size > 0 {
				expectedItemSize = task.Items[itemIndex].Size
			}
		} else {
			task.Items = append(task.Items, transfer.TaskItem{
				Name:  part.FileName(),
				Path:  part.FileName(),
				IsDir: false,
			})
		}
		persistTask(true)

		partReader := io.Reader(&uploadLimitReader{reader: part, remaining: &remainingFileBytes})
		if expectedItemSize > 0 {
			partReader = io.LimitReader(partReader, expectedItemSize)
		}
		written, err := func() (int64, error) {
			_, written, saveErr := fsops.SaveUploadedFileWithProgress(
				a.resolver,
				mountID,
				relPath,
				part.FileName(),
				partReader,
				func(delta int64) {
					task.CompletedBytes += delta
					persistTask(false)
				},
			)
			return written, saveErr
		}()
		task.Items[itemIndex].Size = written
		if err != nil {
			if errors.Is(err, errUploadTooLarge) {
				a.failUploadTask(
					task,
					"UPLOAD_TOO_LARGE",
					uploadTooLargeMessage(a.cfg.MaxUploadBytes),
					w,
					http.StatusRequestEntityTooLarge,
				)
				return
			}
			if errors.Is(err, io.ErrUnexpectedEOF) &&
				isRecoverableMultipartPartEOF(expectedFiles, filesSeen, written, expectedItemSize) {
				uploaded++
				task.Detail = fmt.Sprintf(
					"Uploaded %d/%d files",
					uploaded,
					uploadTaskFileTotal(expectedFiles, len(task.Items)),
				)
				persistTask(true)
				break
			}
			if errors.Is(err, io.ErrUnexpectedEOF) {
				a.failUploadTask(task, "UPLOAD_PARSE_FAILED", err.Error(), w, http.StatusBadRequest)
				return
			}
			continue
		}
		if drainErr := discardMultipartPartRemainder(part, &remainingFileBytes); drainErr != nil {
			if errors.Is(drainErr, errUploadTooLarge) {
				a.failUploadTask(
					task,
					"UPLOAD_TOO_LARGE",
					uploadTooLargeMessage(a.cfg.MaxUploadBytes),
					w,
					http.StatusRequestEntityTooLarge,
				)
				return
			}
			if errors.Is(drainErr, io.ErrUnexpectedEOF) &&
				isRecoverableMultipartDrainEOF(expectedFiles, filesSeen) {
				uploaded++
				task.Detail = fmt.Sprintf(
					"Uploaded %d/%d files",
					uploaded,
					uploadTaskFileTotal(expectedFiles, len(task.Items)),
				)
				persistTask(true)
				break
			}
			a.failUploadTask(task, "UPLOAD_PARSE_FAILED", drainErr.Error(), w, http.StatusBadRequest)
			return
		}

		uploaded++
		task.Detail = fmt.Sprintf(
			"Uploaded %d/%d files",
			uploaded,
			uploadTaskFileTotal(expectedFiles, len(task.Items)),
		)
		persistTask(true)
		if expectedFiles > 0 && filesSeen >= expectedFiles {
			break
		}
	}

	if filesSeen == 0 {
		a.failUploadTask(task, "UPLOAD_EMPTY", "files is required", w, http.StatusBadRequest)
		return
	}

	if uploaded == filesSeen {
		task.Status = "success"
		task.Detail = fmt.Sprintf("Uploaded %d/%d files", uploaded, filesSeen)
		if task.TotalBytes > 0 {
			task.CompletedBytes = task.TotalBytes
		} else {
			task.TotalBytes = task.CompletedBytes
		}
	} else {
		task.Status = "partial"
		task.Detail = fmt.Sprintf("Uploaded %d/%d files", uploaded, filesSeen)
	}
	task.UpdatedAt = time.Now().Unix()
	_ = a.taskManager.Put(task, "")
	writeJSON(w, http.StatusOK, task)
}

func requestedUploadTaskID(r *http.Request) (string, error) {
	raw := strings.TrimSpace(r.Header.Get(uploadTaskIDHeader))
	if raw == "" {
		return "", nil
	}
	if len(raw) > uploadTaskIDMaxLen {
		return "", errors.New("upload task id is too long")
	}
	for _, ch := range raw {
		switch {
		case ch >= 'a' && ch <= 'z':
		case ch >= 'A' && ch <= 'Z':
		case ch >= '0' && ch <= '9':
		case ch == '-' || ch == '_':
		default:
			return "", errors.New("upload task id contains invalid characters")
		}
	}
	return raw, nil
}

func requestedUploadTotalBytes(r *http.Request) int64 {
	raw := strings.TrimSpace(r.Header.Get(uploadTotalBytesHeader))
	if raw == "" {
		return 0
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || value < 0 {
		return 0
	}
	return value
}

func requestedUploadItemCount(r *http.Request) int {
	raw := strings.TrimSpace(r.Header.Get(uploadItemCountHeader))
	if raw == "" {
		return 0
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return 0
	}
	return value
}

func readMultipartFieldValue(part *multipart.Part, maxBytes int64) (string, error) {
	data, err := io.ReadAll(io.LimitReader(part, maxBytes+1))
	if err != nil {
		return "", err
	}
	if int64(len(data)) > maxBytes {
		return "", errors.New("multipart field too large")
	}
	return string(data), nil
}

func uploadTaskFileTotal(expectedFiles, seenFiles int) int {
	if expectedFiles > 0 {
		return expectedFiles
	}
	if seenFiles > 0 {
		return seenFiles
	}
	return 1
}

func (a *api) failUploadTask(task transfer.Task, code, message string, w http.ResponseWriter, status int) {
	task.Status = "failed"
	task.Detail = message
	task.UpdatedAt = time.Now().Unix()
	_ = a.taskManager.Put(task, "")
	writeError(w, status, code, message)
}

func isRecoverableMultipartEOF(err error, expectedFiles, filesSeen, uploaded int) bool {
	return errors.Is(err, io.ErrUnexpectedEOF) &&
		expectedFiles > 0 &&
		filesSeen >= expectedFiles &&
		uploaded == filesSeen
}

func isRecoverableMultipartPartEOF(expectedFiles, filesSeen int, written, expectedItemSize int64) bool {
	return expectedFiles > 0 &&
		filesSeen >= expectedFiles &&
		expectedItemSize > 0 &&
		written == expectedItemSize
}

func isRecoverableMultipartDrainEOF(expectedFiles, filesSeen int) bool {
	return expectedFiles > 0 && filesSeen >= expectedFiles
}

func discardMultipartPartRemainder(part *multipart.Part, remaining *int64) error {
	_, err := io.Copy(io.Discard, &uploadLimitReader{reader: part, remaining: remaining})
	return err
}

var errUploadTooLarge = errors.New("upload exceeds configured size limit")

type uploadLimitReader struct {
	reader    io.Reader
	remaining *int64
}

func (r *uploadLimitReader) Read(p []byte) (int, error) {
	if r.remaining == nil {
		return r.reader.Read(p)
	}
	if *r.remaining < 0 {
		return 0, errUploadTooLarge
	}
	if *r.remaining == 0 {
		var scratch [1]byte
		n, err := r.reader.Read(scratch[:])
		if n > 0 {
			return 0, errUploadTooLarge
		}
		return 0, err
	}
	if int64(len(p)) > *r.remaining {
		p = p[:int(*r.remaining)]
	}
	n, err := r.reader.Read(p)
	*r.remaining -= int64(n)
	return n, err
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
	if len(parts) == 1 && r.Method == http.MethodDelete {
		if err := a.taskManager.Delete(id); err != nil {
			if strings.Contains(err.Error(), "still active") {
				writeError(w, http.StatusConflict, "TASK_ACTIVE", "active task cannot be deleted")
				return
			}
			writeError(w, http.StatusNotFound, "TASK_NOT_FOUND", "task not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	if len(parts) == 2 && parts[1] == "cancel" && r.Method == http.MethodPost {
		var req struct {
			Detail string `json:"detail"`
		}
		if !decodeJSON(w, r, &req) {
			return
		}
		task, err := a.taskManager.Cancel(id, req.Detail)
		if err != nil {
			if strings.Contains(err.Error(), "not pending") {
				writeError(w, http.StatusConflict, "TASK_NOT_PENDING", "only pending tasks can be cancelled")
				return
			}
			writeError(w, http.StatusNotFound, "TASK_NOT_FOUND", "task not found")
			return
		}
		writeJSON(w, http.StatusOK, task)
		return
	}
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
		w.Header().Set("Content-Disposition", taskAttachmentDisposition(id, artifact))
		http.ServeFile(w, r, artifact)
		return
	}
	writeJSON(w, http.StatusOK, task)
}

func taskAttachmentDisposition(taskID, artifact string) string {
	filename := filepath.Base(artifact)
	prefix := taskID + "-"
	if strings.HasPrefix(filename, prefix) {
		filename = strings.TrimPrefix(filename, prefix)
	}
	if strings.TrimSpace(filename) == "" {
		filename = "download.zip"
	}
	asciiFallback := strings.Map(func(r rune) rune {
		if r < 0x20 || r > 0x7e || r == '"' || r == '\\' {
			return '_'
		}
		return r
	}, filename)
	if strings.Trim(asciiFallback, "_") == "" {
		asciiFallback = "download.zip"
	}
	return fmt.Sprintf(
		`attachment; filename="%s"; filename*=UTF-8''%s`,
		asciiFallback,
		url.PathEscape(filename),
	)
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
		if err := fsops.MovePath(record.TrashPath, targetAbs); err != nil {
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

func apiURL(path string) string {
	return normalizeAPIPath(path)
}

func normalizeAPIPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	for _, prefix := range []string{webAPIBase, appAPIBase} {
		if trimmed == prefix || strings.HasPrefix(trimmed, prefix+"/") {
			return canonicalAPIBase + strings.TrimPrefix(trimmed, prefix)
		}
	}
	if trimmed == canonicalAPIBase || strings.HasPrefix(trimmed, canonicalAPIBase+"/") {
		return trimmed
	}
	if strings.HasPrefix(trimmed, "/") {
		return canonicalAPIBase + trimmed
	}
	return canonicalAPIBase + "/" + trimmed
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

func totalUploadBytes(files []*multipart.FileHeader) int64 {
	var total int64
	for _, header := range files {
		total += header.Size
	}
	return total
}

func uploadTooLargeMessage(limit int64) string {
	return fmt.Sprintf("upload size exceeds %d MB limit", limit/(1024*1024))
}
