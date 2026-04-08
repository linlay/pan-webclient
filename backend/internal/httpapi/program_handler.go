package httpapi

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"pan-webclient/backend/internal/config"
)

var immutableAssetPath = regexp.MustCompile(`^.+\.[0-9a-f]{8}(?:\.chunk)?\.(?:js|css|woff2?|png|jpe?g|gif|svg|eot|ttf|otf)$`)

const noStoreCacheControl = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"

type programHandler struct {
	api       http.Handler
	distDir   string
	indexPath string
}

func newProgramHandler(cfg config.Config, api http.Handler) http.Handler {
	distDir := strings.TrimSpace(cfg.FrontendDistDir)
	if distDir == "" {
		return api
	}

	indexPath := filepath.Join(distDir, "index.html")
	info, err := os.Stat(indexPath)
	if err != nil || info.IsDir() {
		return api
	}

	return &programHandler{
		api:       api,
		distDir:   distDir,
		indexPath: indexPath,
	}
}

func (h *programHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case isCanonicalAPIPath(r.URL.Path):
		h.api.ServeHTTP(w, r)
	case r.URL.Path == "/":
		http.Redirect(w, r, "/pan/", http.StatusFound)
	case r.URL.Path == "/pan":
		http.Redirect(w, r, "/pan/", http.StatusFound)
	case r.URL.Path == "/apppan":
		http.Redirect(w, r, "/apppan/", http.StatusFound)
	case isExternalAPIPath(r.URL.Path):
		h.serveExternalAPI(w, r)
	case strings.HasPrefix(r.URL.Path, "/pan/"):
		h.serveUI(w, r, "/pan/")
	case strings.HasPrefix(r.URL.Path, "/apppan/"):
		h.serveUI(w, r, "/apppan/")
	default:
		http.NotFound(w, r)
	}
}

func isCanonicalAPIPath(path string) bool {
	return path == canonicalAPIBase || strings.HasPrefix(path, canonicalAPIBase+"/")
}

func isExternalAPIPath(path string) bool {
	return path == webAPIBase ||
		path == appAPIBase ||
		strings.HasPrefix(path, webAPIBase+"/") ||
		strings.HasPrefix(path, appAPIBase+"/")
}

func (h *programHandler) serveExternalAPI(w http.ResponseWriter, r *http.Request) {
	prefix := webAPIBase
	if strings.HasPrefix(r.URL.Path, appAPIBase) {
		prefix = appAPIBase
	}

	suffix := strings.TrimPrefix(r.URL.Path, prefix)
	rewritten := r.Clone(r.Context())
	rewritten.URL.Path = canonicalAPIBase + suffix
	if rewritten.RequestURI != "" {
		rewritten.RequestURI = rewritten.URL.RequestURI()
	}
	h.api.ServeHTTP(w, rewritten)
}

func (h *programHandler) serveUI(w http.ResponseWriter, r *http.Request, prefix string) {
	relativePath := strings.TrimPrefix(r.URL.Path, prefix)
	relativePath = strings.TrimPrefix(relativePath, "/")
	cleaned := cleanProgramAssetPath(relativePath)
	if cleaned == "" {
		h.serveSPAShell(w, r)
		return
	}

	assetPath, ok := resolveProgramAssetPath(h.distDir, cleaned)
	if !ok {
		http.NotFound(w, r)
		return
	}

	info, err := os.Stat(assetPath)
	if err == nil && !info.IsDir() {
		if immutableAssetPath.MatchString(cleaned) {
			w.Header().Set("Cache-Control", "public, immutable")
		} else {
			setNoStoreHeaders(w)
		}
		http.ServeFile(w, r, assetPath)
		return
	}

	if shouldServeSPAShell(cleaned) {
		h.serveSPAShell(w, r)
		return
	}

	http.NotFound(w, r)
}

func cleanProgramAssetPath(relativePath string) string {
	trimmed := strings.TrimSpace(relativePath)
	if trimmed == "" {
		return ""
	}
	cleaned := path.Clean("/" + trimmed)
	if cleaned == "/" {
		return ""
	}
	return strings.TrimPrefix(cleaned, "/")
}

func resolveProgramAssetPath(distDir, relativePath string) (string, bool) {
	fullPath := filepath.Join(distDir, filepath.FromSlash(relativePath))
	rel, err := filepath.Rel(distDir, fullPath)
	if err != nil {
		return "", false
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", false
	}
	return fullPath, true
}

func shouldServeSPAShell(relativePath string) bool {
	return path.Ext(relativePath) == ""
}

func (h *programHandler) serveSPAShell(w http.ResponseWriter, r *http.Request) {
	setNoStoreHeaders(w)
	http.ServeFile(w, r, h.indexPath)
}

func setNoStoreHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", noStoreCacheControl)
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.Header().Set("CDN-Cache-Control", "no-store")
	w.Header().Set("Cloudflare-CDN-Cache-Control", "no-store")
}
