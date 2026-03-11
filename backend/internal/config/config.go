package config

import (
	"bufio"
	"crypto/rsa"
	"crypto/x509"
	"embed"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

//go:embed application.yml
var defaultsFS embed.FS

type Mount struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Path string `json:"path"`
}

type Config struct {
	PublicPort                string  `json:"public_port"`
	DevWebPort                string  `json:"dev_web_port"`
	WebOrigin                 string  `json:"web_origin"`
	AppAuthLocalPublicKeyFile string  `json:"app_auth_local_public_key_file"`
	StaticDir                 string  `json:"pan_static_dir"`
	DataDir                   string  `json:"pan_data_dir"`
	SessionCookieName         string  `json:"session_cookie_name"`
	SessionSecret             string  `json:"-"`
	AdminUsername             string  `json:"-"`
	AdminPasswordHash         string  `json:"-"`
	MaxUploadBytes            int64   `json:"max_upload_bytes"`
	MaxEditFileBytes          int64   `json:"max_edit_file_bytes"`
	Mounts                    []Mount `json:"mounts"`
}

func Load() (Config, error) {
	var cfg Config
	defaultBytes, err := defaultsFS.ReadFile("application.yml")
	if err != nil {
		return cfg, fmt.Errorf("read default config: %w", err)
	}
	if err := json.Unmarshal(defaultBytes, &cfg); err != nil {
		return cfg, fmt.Errorf("parse default config: %w", err)
	}

	dotEnv, envBaseDir, err := loadDotEnv()
	if err != nil {
		return cfg, err
	}

	applyString(&cfg.PublicPort, lookupEnv(dotEnv, "PUBLIC_PORT"))
	applyString(&cfg.DevWebPort, lookupEnv(dotEnv, "DEV_WEB_PORT"))
	applyString(&cfg.WebOrigin, lookupEnv(dotEnv, "WEB_ORIGIN"))
	applyString(
		&cfg.AppAuthLocalPublicKeyFile,
		lookupEnv(dotEnv, "APP_AUTH_LOCAL_PUBLIC_KEY_FILE"),
	)
	applyString(&cfg.StaticDir, lookupEnv(dotEnv, "PAN_STATIC_DIR"))
	applyString(&cfg.DataDir, lookupEnv(dotEnv, "PAN_DATA_DIR"))
	applyString(&cfg.SessionCookieName, lookupEnv(dotEnv, "SESSION_COOKIE_NAME"))
	applyString(&cfg.SessionSecret, lookupEnv(dotEnv, "WEB_SESSION_SECRET"))
	applyString(&cfg.AdminUsername, lookupEnv(dotEnv, "PAN_ADMIN_USERNAME"))
	applyString(&cfg.AdminPasswordHash, lookupEnv(dotEnv, "AUTH_PASSWORD_HASH_BCRYPT"))

	if v := lookupEnv(dotEnv, "MAX_UPLOAD_BYTES"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			cfg.MaxUploadBytes = parsed
		}
	}
	if v := lookupEnv(dotEnv, "MAX_EDIT_FILE_BYTES"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			cfg.MaxEditFileBytes = parsed
		}
	}
	if cfg.PublicPort == "" {
		cfg.PublicPort = "8080"
	}
	if cfg.WebOrigin == "" {
		cfg.WebOrigin = localOrigin(cfg.PublicPort)
	}
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = "pan_session"
	}
	if cfg.AdminUsername == "" {
		cfg.AdminUsername = "admin"
	}
	if cfg.MaxUploadBytes <= 0 {
		cfg.MaxUploadBytes = 100 * 1024 * 1024
	}
	if cfg.MaxEditFileBytes <= 0 {
		cfg.MaxEditFileBytes = 1024 * 1024
	}
	if cfg.DataDir == "" {
		cfg.DataDir = "./data"
	}
	if cfg.AppAuthLocalPublicKeyFile == "" {
		cfg.AppAuthLocalPublicKeyFile = "./configs/local-public-key.pem"
	}

	mounts, err := loadMountFiles(filepath.Join("configs", "mounts"))
	if err != nil {
		return cfg, err
	}
	if len(mounts) > 0 {
		cfg.Mounts = mounts
	} else if v := lookupEnv(dotEnv, "PAN_MOUNTS"); v != "" {
		mounts, err := parseMounts(v)
		if err != nil {
			return cfg, err
		}
		cfg.Mounts = mounts
	}
	if len(cfg.Mounts) == 0 {
		cfg.Mounts = []Mount{{ID: "workspace", Name: "Workspace", Path: "."}}
	}

	if strings.TrimSpace(cfg.SessionSecret) == "" {
		return cfg, fmt.Errorf("WEB_SESSION_SECRET is required")
	}
	if strings.TrimSpace(cfg.AdminPasswordHash) == "" {
		return cfg, fmt.Errorf("AUTH_PASSWORD_HASH_BCRYPT is required")
	}

	for i := range cfg.Mounts {
		if cfg.Mounts[i].ID == "" {
			cfg.Mounts[i].ID = fmt.Sprintf("mount-%d", i+1)
		}
		if cfg.Mounts[i].Name == "" {
			cfg.Mounts[i].Name = cfg.Mounts[i].ID
		}
		absPath, err := filepath.Abs(cfg.Mounts[i].Path)
		if err != nil {
			return cfg, fmt.Errorf("resolve mount %s: %w", cfg.Mounts[i].ID, err)
		}
		cfg.Mounts[i].Path = absPath
	}

	absDataDir, err := filepath.Abs(cfg.DataDir)
	if err != nil {
		return cfg, fmt.Errorf("resolve data dir: %w", err)
	}
	cfg.DataDir = absDataDir
	resolvedPublicKeyFile, err := resolveLocalPublicKeyFile(
		cfg.AppAuthLocalPublicKeyFile,
		envBaseDir,
	)
	if err != nil {
		return cfg, err
	}
	cfg.AppAuthLocalPublicKeyFile = resolvedPublicKeyFile
	return cfg, nil
}

func applyString(dst *string, v string) {
	if strings.TrimSpace(v) != "" {
		*dst = strings.TrimSpace(v)
	}
}

func localOrigin(port string) string {
	return "http://127.0.0.1:" + port
}

func lookupEnv(dotEnv map[string]string, key string) string {
	if value, ok := os.LookupEnv(key); ok {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return dotEnv[key]
}

func loadDotEnv() (map[string]string, string, error) {
	values := map[string]string{}
	envBaseDir := ""
	for _, path := range envCandidates() {
		file, err := os.Open(path)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, "", fmt.Errorf("open %s: %w", path, err)
		}
		parsed, err := parseDotEnvFile(file)
		_ = file.Close()
		if err != nil {
			return nil, "", fmt.Errorf("scan %s: %w", path, err)
		}
		for key, value := range parsed {
			values[key] = value
		}
		envBaseDir = filepath.Dir(path)
	}
	return values, envBaseDir, nil
}

func envCandidates() []string {
	cwd, _ := os.Getwd()
	return dedupePaths([]string{
		filepath.Join(cwd, "..", ".env"),
		filepath.Join(cwd, ".env"),
	})
}

func parseDotEnvFile(file *os.File) (map[string]string, error) {
	values := map[string]string{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		values[key] = trimQuotes(strings.TrimSpace(value))
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return values, nil
}

func trimQuotes(value string) string {
	if len(value) >= 2 {
		if value[0] == '"' && value[len(value)-1] == '"' {
			return value[1 : len(value)-1]
		}
		if value[0] == '\'' && value[len(value)-1] == '\'' {
			return value[1 : len(value)-1]
		}
	}
	return value
}

func resolveLocalPublicKeyFile(rawPath, envBaseDir string) (string, error) {
	trimmed := strings.TrimSpace(rawPath)
	if trimmed == "" {
		return "", nil
	}
	resolved := trimmed
	if !filepath.IsAbs(resolved) {
		baseDir := strings.TrimSpace(envBaseDir)
		if baseDir == "" {
			cwd, _ := os.Getwd()
			baseDir = cwd
		}
		resolved = filepath.Join(baseDir, resolved)
	}
	resolved = filepath.Clean(resolved)
	payload, err := os.ReadFile(resolved)
	if err != nil {
		return "", fmt.Errorf("read app auth local public key file %s: %w", resolved, err)
	}
	if _, err := parseRSAPublicKeyPEM(payload); err != nil {
		return "", fmt.Errorf("parse app auth local public key file %s: %w", resolved, err)
	}
	return resolved, nil
}

func parseRSAPublicKeyPEM(payload []byte) (*rsa.PublicKey, error) {
	block, _ := pem.Decode(payload)
	if block == nil {
		return nil, errors.New("pem decode failed")
	}
	key, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("rsa parse failed: %w", err)
	}
	rsaKey, ok := key.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("rsa parse failed")
	}
	return rsaKey, nil
}

func dedupePaths(paths []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(paths))
	for _, path := range paths {
		if path == "" {
			continue
		}
		cleaned := filepath.Clean(path)
		if _, ok := seen[cleaned]; ok {
			continue
		}
		seen[cleaned] = struct{}{}
		result = append(result, cleaned)
	}
	return result
}

func parseMounts(raw string) ([]Mount, error) {
	items := strings.Split(raw, ",")
	result := make([]Mount, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		parts := strings.Split(item, "|")
		if len(parts) != 3 {
			return nil, fmt.Errorf("invalid PAN_MOUNTS item %q, expected id|name|path", item)
		}
		result = append(result, Mount{
			ID:   strings.TrimSpace(parts[0]),
			Name: strings.TrimSpace(parts[1]),
			Path: strings.TrimSpace(parts[2]),
		})
	}
	return result, nil
}

func loadMountFiles(dir string) ([]Mount, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read mounts dir: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".json") || strings.HasSuffix(name, ".example.json") {
			continue
		}
		files = append(files, filepath.Join(dir, name))
	}
	sort.Strings(files)

	result := make([]Mount, 0, len(files))
	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			return nil, fmt.Errorf("read mount file %s: %w", file, err)
		}
		var mount Mount
		if err := json.Unmarshal(content, &mount); err != nil {
			return nil, fmt.Errorf("parse mount file %s: %w", file, err)
		}
		result = append(result, mount)
	}
	return result, nil
}
