package httpapi

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"pan-webclient/backend/internal/fsops"
	"pan-webclient/backend/internal/indexer"
	"pan-webclient/backend/internal/mounts"
	"pan-webclient/backend/internal/preview"
	"pan-webclient/backend/internal/transfer"
)

const (
	shareAccessPublic    = "public"
	shareAccessPassword  = "password"
	sharePermissionRead  = "read"
	sharePermissionWrite = "write"
	shareWriteModeLocal  = "local"
	shareWriteModeText   = "text"
	maxShareDescription  = 300
	maxShareLifetime     = 365 * 24 * time.Hour
	shareSessionTTL      = 24 * time.Hour
	shareShortCodeLen    = 8
)

var (
	errShareExpired          = errors.New("share expired")
	errSharePasswordRequired = errors.New("share password required")
	errShareReadRequired     = errors.New("share does not allow file access")
	errShareWriteRequired    = errors.New("share does not allow uploads")
)

type shareCreateRequest struct {
	MountID     string `json:"mountId"`
	Path        string `json:"path"`
	Access      string `json:"access"`
	Permission  string `json:"permission"`
	WriteMode   string `json:"writeMode"`
	Description string `json:"description"`
	ExpiresAt   int64  `json:"expiresAt"`
}

type shareCreateResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	IsDir       bool   `json:"isDir"`
	Access      string `json:"access"`
	Permission  string `json:"permission"`
	WriteMode   string `json:"writeMode"`
	Description string `json:"description,omitempty"`
	ExpiresAt   int64  `json:"expiresAt"`
	Password    string `json:"password,omitempty"`
	URLPath     string `json:"urlPath"`
}

type managedShareResponse struct {
	ID          string `json:"id"`
	MountID     string `json:"mountId"`
	Path        string `json:"path"`
	Name        string `json:"name"`
	IsDir       bool   `json:"isDir"`
	Access      string `json:"access"`
	Permission  string `json:"permission"`
	WriteMode   string `json:"writeMode"`
	Description string `json:"description,omitempty"`
	Password    string `json:"password,omitempty"`
	ExpiresAt   int64  `json:"expiresAt"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
	Expired     bool   `json:"expired"`
	URLPath     string `json:"urlPath"`
}

type shareSaveRequest struct {
	MountID   string `json:"mountId"`
	TargetDir string `json:"targetDir"`
	Path      string `json:"path"`
}

type publicShareResponse struct {
	ID               string        `json:"id"`
	Name             string        `json:"name"`
	IsDir            bool          `json:"isDir"`
	Access           string        `json:"access"`
	Permission       string        `json:"permission"`
	WriteMode        string        `json:"writeMode"`
	Description      string        `json:"description,omitempty"`
	RequiresPassword bool          `json:"requiresPassword"`
	Authorized       bool          `json:"authorized"`
	ExpiresAt        int64         `json:"expiresAt"`
	Preview          *preview.Meta `json:"preview,omitempty"`
	Entries          []fsops.Entry `json:"entries,omitempty"`
}

func (a *api) shares(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.listShares(w, r)
		return
	case http.MethodPost:
	default:
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var req shareCreateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	record, password, err := a.createShare(req)
	if err != nil {
		writeShareError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shareCreateResponse{
		ID:          record.ID,
		Name:        record.Name,
		IsDir:       record.IsDir,
		Access:      record.Access,
		Permission:  record.Permission,
		WriteMode:   record.WriteMode,
		Description: record.Description,
		ExpiresAt:   record.ExpiresAt,
		Password:    password,
		URLPath:     shareURLPath(record.ID),
	})
}

func (a *api) shareRoute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	id := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/shares/"), "/")
	if id == "" {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "share not found")
		return
	}
	if err := a.store.DeleteShare(id); err != nil {
		if os.IsNotExist(err) {
			writeError(w, http.StatusNotFound, "SHARE_NOT_FOUND", "share not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "SHARE_DELETE_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *api) listShares(w http.ResponseWriter, _ *http.Request) {
	records, err := a.store.ListShares(0)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "SHARE_LIST_FAILED", err.Error())
		return
	}
	now := time.Now().Unix()
	items := make([]managedShareResponse, 0, len(records))
	for _, record := range records {
		permission := sharePermission(record)
		password := ""
		if record.Access == shareAccessPassword && record.PasswordCipher != "" {
			password, err = decryptSharePassword(a.cfg.SessionSecret, record.ID, record.PasswordCipher)
			if err != nil {
				password = ""
			}
		}
		items = append(items, managedShareResponse{
			ID:          record.ID,
			MountID:     record.MountID,
			Path:        record.Path,
			Name:        record.Name,
			IsDir:       record.IsDir,
			Access:      record.Access,
			Permission:  permission,
			WriteMode:   shareWriteMode(record),
			Description: record.Description,
			Password:    password,
			ExpiresAt:   record.ExpiresAt,
			CreatedAt:   record.CreatedAt,
			UpdatedAt:   record.UpdatedAt,
			Expired:     record.ExpiresAt > 0 && now >= record.ExpiresAt,
			URLPath:     shareURLPath(record.ID),
		})
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *api) createShare(req shareCreateRequest) (indexer.ShareRecord, string, error) {
	access := strings.ToLower(strings.TrimSpace(req.Access))
	if access != shareAccessPublic && access != shareAccessPassword {
		return indexer.ShareRecord{}, "", fmt.Errorf("invalid share access mode")
	}
	_, abs, clean, err := a.resolver.Resolve(req.MountID, req.Path)
	if err != nil {
		return indexer.ShareRecord{}, "", err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return indexer.ShareRecord{}, "", err
	}
	permission, err := normalizeSharePermission(req.Permission, info.IsDir())
	if err != nil {
		return indexer.ShareRecord{}, "", err
	}
	writeMode, err := normalizeShareWriteMode(req.WriteMode, permission)
	if err != nil {
		return indexer.ShareRecord{}, "", err
	}
	description, err := normalizeShareDescription(req.Description, permission)
	if err != nil {
		return indexer.ShareRecord{}, "", err
	}
	expiresAt, err := normalizeShareExpiry(req.ExpiresAt)
	if err != nil {
		return indexer.ShareRecord{}, "", err
	}
	id, err := a.generateShareID()
	if err != nil {
		return indexer.ShareRecord{}, "", err
	}
	now := time.Now().Unix()
	record := indexer.ShareRecord{
		ID:          id,
		MountID:     req.MountID,
		Path:        clean,
		Name:        info.Name(),
		IsDir:       info.IsDir(),
		Access:      access,
		Permission:  permission,
		WriteMode:   writeMode,
		Description: description,
		ExpiresAt:   expiresAt,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	password := ""
	if access == shareAccessPassword {
		password, err = randomSharePassword()
		if err != nil {
			return indexer.ShareRecord{}, "", err
		}
		record.PasswordDigest = hashSharePassword(a.cfg.SessionSecret, record.ID, password)
		record.PasswordCipher, err = encryptSharePassword(a.cfg.SessionSecret, record.ID, password)
		if err != nil {
			return indexer.ShareRecord{}, "", err
		}
	}
	if err := a.store.PutShare(record); err != nil {
		return indexer.ShareRecord{}, "", err
	}
	return record, password, nil
}

func (a *api) publicShareRoute(w http.ResponseWriter, r *http.Request) {
	trimmed := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/public/shares/"), "/")
	if trimmed == "" {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "share not found")
		return
	}
	parts := strings.Split(trimmed, "/")
	record, err := a.loadActiveShare(parts[0])
	if err != nil {
		writeShareError(w, err)
		return
	}
	switch {
	case len(parts) == 1 && r.Method == http.MethodGet:
		a.publicShare(w, r, record)
		return
	case len(parts) == 2 && parts[1] == "authorize" && r.Method == http.MethodPost:
		a.publicShareAuthorize(w, r, record)
		return
	case len(parts) == 2 && parts[1] == "files" && r.Method == http.MethodGet:
		a.publicShareFiles(w, r, record)
		return
	case len(parts) == 2 && parts[1] == "preview" && r.Method == http.MethodGet:
		a.publicSharePreview(w, r, record)
		return
	case len(parts) == 2 && parts[1] == "raw" && r.Method == http.MethodGet:
		a.publicShareRaw(w, r, record)
		return
	case len(parts) == 2 && parts[1] == "download" && r.Method == http.MethodGet:
		a.publicShareDownload(w, r, record)
		return
	case len(parts) == 2 && parts[1] == "save" && r.Method == http.MethodPost:
		a.publicShareSave(w, r, record)
		return
	case len(parts) == 2 && parts[1] == "uploads" && r.Method == http.MethodPost:
		a.publicShareUpload(w, r, record)
		return
	default:
		writeError(w, http.StatusNotFound, "NOT_FOUND", "share route not found")
	}
}

func (a *api) publicShare(w http.ResponseWriter, r *http.Request, record indexer.ShareRecord) {
	authorized := a.shareAuthorized(r, record)
	resp := publicShareResponse{
		ID:               record.ID,
		Name:             record.Name,
		IsDir:            record.IsDir,
		Access:           record.Access,
		Permission:       record.Permission,
		WriteMode:        shareWriteMode(record),
		Description:      record.Description,
		RequiresPassword: record.Access == shareAccessPassword,
		Authorized:       authorized,
		ExpiresAt:        record.ExpiresAt,
	}
	if record.Access == shareAccessPassword && !authorized {
		resp.Name = "受保护的分享"
		resp.Description = ""
		writeJSON(w, http.StatusOK, resp)
		return
	}
	meta, entries, err := a.shareRootPayload(record)
	if err != nil {
		writeShareError(w, err)
		return
	}
	resp.Preview = &meta
	resp.Entries = entries
	writeJSON(w, http.StatusOK, resp)
}

func (a *api) publicShareAuthorize(w http.ResponseWriter, r *http.Request, record indexer.ShareRecord) {
	if record.Access != shareAccessPassword {
		writeError(w, http.StatusBadRequest, "SHARE_NOT_PASSWORD_PROTECTED", "share does not require a password")
		return
	}
	var req struct {
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if !matchSharePassword(a.cfg.SessionSecret, record, req.Password) {
		writeError(w, http.StatusUnauthorized, "INVALID_SHARE_PASSWORD", "invalid share password")
		return
	}
	ttl := shareAccessDuration(record.ExpiresAt)
	token, err := a.auth.IssueScopedToken(record.ID, "share", ttl)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "TOKEN_ERROR", err.Error())
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     shareAccessCookieName(record.ID),
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(ttl.Seconds()),
	})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *api) publicShareFiles(w http.ResponseWriter, r *http.Request, record indexer.ShareRecord) {
	if err := a.requireShareAccess(r, record); err != nil {
		writeShareError(w, err)
		return
	}
	if !record.IsDir {
		writeError(w, http.StatusBadRequest, "SHARE_NOT_DIRECTORY", "shared item is not a directory")
		return
	}
	resolver, err := a.shareResolver(record)
	if err != nil {
		writeShareError(w, err)
		return
	}
	entries, err := fsops.ListDirectory(resolver, record.ID, requestedSharePath(r), true)
	if err != nil {
		writeShareError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (a *api) publicSharePreview(w http.ResponseWriter, r *http.Request, record indexer.ShareRecord) {
	if err := a.requireShareAccess(r, record); err != nil {
		writeShareError(w, err)
		return
	}
	meta, err := a.sharePreview(record, requestedSharePath(r))
	if err != nil {
		writeShareError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, meta)
}

func (a *api) publicShareRaw(w http.ResponseWriter, r *http.Request, record indexer.ShareRecord) {
	if err := a.requireShareAccess(r, record); err != nil {
		writeShareError(w, err)
		return
	}
	if err := requireShareRead(record); err != nil {
		writeShareError(w, err)
		return
	}
	if err := a.serveShareContent(w, r, record, requestedSharePath(r), false); err != nil {
		writeShareError(w, err)
		return
	}
}

func (a *api) publicShareDownload(w http.ResponseWriter, r *http.Request, record indexer.ShareRecord) {
	if err := a.requireShareAccess(r, record); err != nil {
		writeShareError(w, err)
		return
	}
	if err := requireShareRead(record); err != nil {
		writeShareError(w, err)
		return
	}
	if err := a.serveShareContent(w, r, record, requestedSharePath(r), true); err != nil {
		writeShareError(w, err)
		return
	}
}

func (a *api) publicShareSave(w http.ResponseWriter, r *http.Request, record indexer.ShareRecord) {
	if err := a.requireShareAccess(r, record); err != nil {
		writeShareError(w, err)
		return
	}
	if err := requireShareRead(record); err != nil {
		writeShareError(w, err)
		return
	}
	if _, err := a.authenticate(r); err != nil {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "please log in before saving this share")
		return
	}
	var req shareSaveRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	entry, err := a.saveShare(record, req.Path, req.MountID, req.TargetDir)
	if err != nil {
		writeShareError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (a *api) publicShareUpload(w http.ResponseWriter, r *http.Request, record indexer.ShareRecord) {
	if err := a.requireShareAccess(r, record); err != nil {
		writeShareError(w, err)
		return
	}
	if !record.IsDir {
		writeError(w, http.StatusBadRequest, "SHARE_NOT_DIRECTORY", "shared item is not a directory")
		return
	}
	if err := requireShareWrite(record); err != nil {
		writeShareError(w, err)
		return
	}

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
	if len(files) == 0 {
		writeError(w, http.StatusBadRequest, "UPLOAD_EMPTY", "files is required")
		return
	}
	if totalUploadBytes(files) > a.cfg.MaxUploadBytes {
		writeError(
			w,
			http.StatusRequestEntityTooLarge,
			"UPLOAD_TOO_LARGE",
			uploadTooLargeMessage(a.cfg.MaxUploadBytes),
		)
		return
	}

	targetPath := normalizeSharePath(r.FormValue("path"))
	resolver, err := a.shareResolver(record)
	if err != nil {
		writeShareError(w, err)
		return
	}
	_, targetAbs, _, err := resolver.Resolve(record.ID, targetPath)
	if err != nil {
		writeShareError(w, err)
		return
	}
	info, err := os.Stat(targetAbs)
	if err != nil {
		writeShareError(w, err)
		return
	}
	if !info.IsDir() {
		writeError(w, http.StatusBadRequest, "UPLOAD_TARGET_INVALID", "upload target must be a directory")
		return
	}

	uploaded := make([]fsops.Entry, 0, len(files))
	var uploadErr error
	for _, header := range files {
		src, err := header.Open()
		if err != nil {
			uploadErr = err
			continue
		}
		entry, _, err := fsops.SaveUploadedFile(resolver, record.ID, targetPath, header.Filename, src)
		_ = src.Close()
		if err == nil {
			uploaded = append(uploaded, entry)
			continue
		}
		uploadErr = err
	}
	if len(uploaded) == 0 && uploadErr != nil {
		writeShareError(w, uploadErr)
		return
	}
	writeJSON(w, http.StatusOK, uploaded)
}

func (a *api) shareRootPayload(record indexer.ShareRecord) (preview.Meta, []fsops.Entry, error) {
	meta, err := a.sharePreview(record, "/")
	if err != nil {
		return preview.Meta{}, nil, err
	}
	var entries []fsops.Entry
	if record.IsDir {
		resolver, err := a.shareResolver(record)
		if err != nil {
			return preview.Meta{}, nil, err
		}
		entries, err = fsops.ListDirectory(resolver, record.ID, "/", true)
		if err != nil {
			return preview.Meta{}, nil, err
		}
	}
	return meta, entries, nil
}

func (a *api) sharePreview(record indexer.ShareRecord, requestedPath string) (preview.Meta, error) {
	if !record.IsDir {
		if normalizeSharePath(requestedPath) != "/" {
			return preview.Meta{}, errors.New("path escapes share root")
		}
		meta, err := preview.Build(
			a.resolver,
			record.MountID,
			record.Path,
			a.publicShareRawURL(record.ID, "/"),
			a.cfg.MaxEditFileBytes,
		)
		if err != nil {
			return preview.Meta{}, err
		}
		meta.MountID = record.ID
		meta.Path = "/"
		return meta, nil
	}
	resolver, err := a.shareResolver(record)
	if err != nil {
		return preview.Meta{}, err
	}
	path := normalizeSharePath(requestedPath)
	if record.Permission == sharePermissionWrite {
		_, abs, _, err := resolver.Resolve(record.ID, path)
		if err != nil {
			return preview.Meta{}, err
		}
		info, err := os.Stat(abs)
		if err != nil {
			return preview.Meta{}, err
		}
		if !info.IsDir() {
			return preview.Meta{}, errShareReadRequired
		}
	}
	meta, err := preview.Build(
		resolver,
		record.ID,
		path,
		a.publicShareRawURL(record.ID, path),
		a.cfg.MaxEditFileBytes,
	)
	if err != nil {
		return preview.Meta{}, err
	}
	if path == "/" {
		meta.Name = record.Name
	}
	return meta, nil
}

func (a *api) serveShareContent(
	w http.ResponseWriter,
	r *http.Request,
	record indexer.ShareRecord,
	requestedPath string,
	forceAttachment bool,
) error {
	path := normalizeSharePath(requestedPath)
	if !record.IsDir {
		if path != "/" {
			return errors.New("path escapes share root")
		}
		return serveFileFromResolver(w, r, a.resolver, record.MountID, record.Path, record.Name, forceAttachment)
	}
	resolver, err := a.shareResolver(record)
	if err != nil {
		return err
	}
	_, abs, _, err := resolver.Resolve(record.ID, path)
	if err != nil {
		return err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return err
	}
	if info.IsDir() {
		if !forceAttachment {
			return errors.New("directory cannot be streamed inline")
		}
		filename := sanitizeArchiveName(record.Name)
		if path != "/" {
			filename = sanitizeArchiveName(filepath.Base(abs))
		}
		w.Header().Set("Content-Type", "application/zip")
		w.Header().Set("Content-Disposition", attachmentDisposition(filename))
		return transfer.StreamZipArchive(w, resolver, record.ID, []string{path})
	}
	return serveFileFromResolver(w, r, resolver, record.ID, path, filepath.Base(abs), forceAttachment)
}

func (a *api) saveShare(
	record indexer.ShareRecord,
	requestedPath string,
	targetMountID string,
	targetDir string,
) (fsops.Entry, error) {
	path := normalizeSharePath(requestedPath)
	if !record.IsDir {
		if path != "/" {
			return fsops.Entry{}, errors.New("path escapes share root")
		}
		return fsops.CopyToDirectory(
			a.resolver,
			record.MountID,
			record.Path,
			a.resolver,
			targetMountID,
			targetDir,
		)
	}
	if path == "/" {
		return fsops.CopyToDirectory(
			a.resolver,
			record.MountID,
			record.Path,
			a.resolver,
			targetMountID,
			targetDir,
		)
	}
	resolver, err := a.shareResolver(record)
	if err != nil {
		return fsops.Entry{}, err
	}
	return fsops.CopyToDirectory(
		resolver,
		record.ID,
		path,
		a.resolver,
		targetMountID,
		targetDir,
	)
}

func serveFileFromResolver(
	w http.ResponseWriter,
	r *http.Request,
	resolver *fsops.MountResolver,
	mountID string,
	relPath string,
	downloadName string,
	forceAttachment bool,
) error {
	file, info, err := fsops.OpenFile(resolver, mountID, relPath)
	if err != nil {
		return err
	}
	defer file.Close()
	if info.IsDir() {
		return errors.New("path is a directory")
	}
	if forceAttachment {
		w.Header().Set("Content-Disposition", attachmentDisposition(downloadName))
	}
	contentType := fsops.DetectMime(relPath, nil)
	w.Header().Set("Content-Type", contentType)
	http.ServeContent(w, r, downloadName, info.ModTime(), file)
	return nil
}

func (a *api) shareResolver(record indexer.ShareRecord) (*fsops.MountResolver, error) {
	_, abs, _, err := a.resolver.Resolve(record.MountID, record.Path)
	if err != nil {
		return nil, err
	}
	return fsops.NewMountResolver([]mounts.Mount{{
		ID:   record.ID,
		Name: record.Name,
		Path: abs,
	}}), nil
}

func (a *api) loadActiveShare(id string) (indexer.ShareRecord, error) {
	record, err := a.store.GetShare(id)
	if err != nil {
		return indexer.ShareRecord{}, err
	}
	record.Permission = sharePermission(record)
	if record.ExpiresAt > 0 && time.Now().Unix() >= record.ExpiresAt {
		return indexer.ShareRecord{}, errShareExpired
	}
	return record, nil
}

func (a *api) requireShareAccess(r *http.Request, record indexer.ShareRecord) error {
	if record.Access == shareAccessPublic {
		return nil
	}
	if a.shareAuthorized(r, record) {
		return nil
	}
	return errSharePasswordRequired
}

func (a *api) shareAuthorized(r *http.Request, record indexer.ShareRecord) bool {
	if record.Access == shareAccessPublic {
		return true
	}
	cookie, err := r.Cookie(shareAccessCookieName(record.ID))
	if err != nil || cookie.Value == "" {
		return false
	}
	claims, err := a.auth.VerifyScopedToken(cookie.Value, "share")
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(claims.Sub), []byte(record.ID)) == 1
}

func (a *api) generateShareID() (string, error) {
	for range 16 {
		id, err := randomBase62(shareShortCodeLen)
		if err != nil {
			return "", err
		}
		if _, err := a.store.GetShare(id); os.IsNotExist(err) {
			return id, nil
		} else if err != nil {
			return "", err
		}
	}
	return "", errors.New("failed to allocate share id")
}

func (a *api) publicShareRawURL(id, requestedPath string) string {
	return normalizeAPIPath(
		"/public/shares/" + url.PathEscape(id) + "/raw?path=" + url.QueryEscape(normalizeSharePath(requestedPath)),
	)
}

func requestedSharePath(r *http.Request) string {
	return normalizeSharePath(r.URL.Query().Get("path"))
}

func normalizeSharePath(path string) string {
	if path == "" || path == "." {
		return "/"
	}
	raw := strings.ReplaceAll(path, "\\", "/")
	for _, part := range strings.Split(raw, "/") {
		if part == ".." {
			return "/../"
		}
	}
	clean := filepath.ToSlash(filepath.Clean("/" + raw))
	if clean == "." {
		return "/"
	}
	return clean
}

func normalizeShareExpiry(expiresAt int64) (int64, error) {
	if expiresAt == 0 {
		return 0, nil
	}
	expiry := time.Unix(expiresAt, 0)
	now := time.Now()
	if !expiry.After(now) {
		return 0, errors.New("share expiry must be in the future")
	}
	if expiry.After(now.Add(maxShareLifetime)) {
		return 0, errors.New("share expiry cannot be more than 365 days")
	}
	return expiry.Unix(), nil
}

func normalizeSharePermission(permission string, isDir bool) (string, error) {
	switch strings.ToLower(strings.TrimSpace(permission)) {
	case "", sharePermissionRead:
		return sharePermissionRead, nil
	case sharePermissionWrite:
		if !isDir {
			return "", errors.New("write shares only support directories")
		}
		return sharePermissionWrite, nil
	default:
		return "", errors.New("invalid share permission")
	}
}

func normalizeShareWriteMode(writeMode string, permission string) (string, error) {
	if permission != sharePermissionWrite {
		return shareWriteModeLocal, nil
	}
	switch strings.ToLower(strings.TrimSpace(writeMode)) {
	case "", shareWriteModeLocal:
		return shareWriteModeLocal, nil
	case shareWriteModeText:
		return shareWriteModeText, nil
	default:
		return "", errors.New("invalid share write mode")
	}
}

func normalizeShareDescription(description string, permission string) (string, error) {
	if permission != sharePermissionWrite {
		return "", nil
	}
	trimmed := strings.TrimSpace(description)
	if trimmed == "" {
		return "", nil
	}
	if utf8.RuneCountInString(trimmed) > maxShareDescription {
		return "", fmt.Errorf("share description cannot exceed %d characters", maxShareDescription)
	}
	return trimmed, nil
}

func sharePermission(record indexer.ShareRecord) string {
	if record.IsDir && strings.EqualFold(strings.TrimSpace(record.Permission), sharePermissionWrite) {
		return sharePermissionWrite
	}
	return sharePermissionRead
}

func shareWriteMode(record indexer.ShareRecord) string {
	if sharePermission(record) != sharePermissionWrite {
		return shareWriteModeLocal
	}
	if strings.EqualFold(strings.TrimSpace(record.WriteMode), shareWriteModeText) {
		return shareWriteModeText
	}
	return shareWriteModeLocal
}

func requireShareRead(record indexer.ShareRecord) error {
	if sharePermission(record) != sharePermissionRead {
		return errShareReadRequired
	}
	return nil
}

func requireShareWrite(record indexer.ShareRecord) error {
	if sharePermission(record) != sharePermissionWrite {
		return errShareWriteRequired
	}
	return nil
}

func shareAccessDuration(expiresAt int64) time.Duration {
	if expiresAt <= 0 {
		return shareSessionTTL
	}
	ttl := time.Until(time.Unix(expiresAt, 0))
	if ttl <= 0 {
		return time.Minute
	}
	if ttl > shareSessionTTL {
		return shareSessionTTL
	}
	return ttl
}

func hashSharePassword(secret, shareID, password string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = io.WriteString(mac, shareID)
	_, _ = io.WriteString(mac, ":")
	_, _ = io.WriteString(mac, strings.TrimSpace(password))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func encryptSharePassword(secret, shareID, password string) (string, error) {
	key := sharePasswordKey(secret, shareID)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	payload := gcm.Seal(nonce, nonce, []byte(strings.TrimSpace(password)), []byte(shareID))
	return base64.RawURLEncoding.EncodeToString(payload), nil
}

func decryptSharePassword(secret, shareID, encoded string) (string, error) {
	key := sharePasswordKey(secret, shareID)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	payload, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	if len(payload) < gcm.NonceSize() {
		return "", errors.New("invalid password payload")
	}
	nonce := payload[:gcm.NonceSize()]
	ciphertext := payload[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, []byte(shareID))
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func sharePasswordKey(secret, shareID string) []byte {
	sum := sha256.Sum256([]byte(secret + ":" + shareID))
	return sum[:]
}

func matchSharePassword(secret string, record indexer.ShareRecord, password string) bool {
	expected := hashSharePassword(secret, record.ID, password)
	return subtle.ConstantTimeCompare([]byte(expected), []byte(record.PasswordDigest)) == 1
}

func randomSharePassword() (string, error) {
	raw := make([]byte, 2)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	value := int(raw[0])<<8 | int(raw[1])
	return fmt.Sprintf("%04d", value%10000), nil
}

func randomBase62(length int) (string, error) {
	const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	if length <= 0 {
		return "", errors.New("invalid share id length")
	}
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	for i := range bytes {
		bytes[i] = alphabet[int(bytes[i])%len(alphabet)]
	}
	return string(bytes), nil
}

func shareAccessCookieName(id string) string {
	return "pan_share_" + id
}

func shareURLPath(id string) string {
	return "/pan/s/" + url.PathEscape(id)
}

func attachmentDisposition(filename string) string {
	asciiFallback := strings.Map(func(r rune) rune {
		if r < 0x20 || r > 0x7e || r == '"' || r == '\\' {
			return '_'
		}
		return r
	}, filename)
	if strings.Trim(asciiFallback, "_") == "" {
		asciiFallback = "download"
	}
	return fmt.Sprintf(
		`attachment; filename="%s"; filename*=UTF-8''%s`,
		asciiFallback,
		url.PathEscape(filename),
	)
}

func sanitizeArchiveName(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return "share.zip"
	}
	base := filepath.Base(trimmed)
	if !strings.HasSuffix(strings.ToLower(base), ".zip") {
		base += ".zip"
	}
	return base
}

func writeShareError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errShareExpired):
		writeError(w, http.StatusGone, "SHARE_EXPIRED", "share expired")
	case errors.Is(err, errSharePasswordRequired):
		writeError(w, http.StatusUnauthorized, "SHARE_PASSWORD_REQUIRED", "share password required")
	case errors.Is(err, errShareReadRequired):
		writeError(w, http.StatusForbidden, "SHARE_READ_ONLY", "write share does not allow file access")
	case errors.Is(err, errShareWriteRequired):
		writeError(w, http.StatusForbidden, "SHARE_UPLOAD_FORBIDDEN", "share does not allow uploads")
	case os.IsNotExist(err):
		writeError(w, http.StatusNotFound, "SHARE_NOT_FOUND", "share not found")
	case strings.Contains(err.Error(), "path escapes"):
		writeError(w, http.StatusBadRequest, "INVALID_SHARE_PATH", err.Error())
	default:
		writeError(w, http.StatusBadRequest, "SHARE_REQUEST_FAILED", err.Error())
	}
}
