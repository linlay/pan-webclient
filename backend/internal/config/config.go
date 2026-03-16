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
	ID       string `json:"id"`
	Name     string `json:"name"`
	Source   string `json:"source,omitempty"`
	Path     string `json:"path"`
	ReadOnly bool   `json:"readOnly,omitempty"`
}

type Config struct {
	APIPort                   string  `json:"api_port"`
	AppAuthLocalPublicKeyFile string  `json:"app_auth_local_public_key_file"`
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
	configBaseDir, err := configBaseDir(envBaseDir)
	if err != nil {
		return cfg, err
	}

	applyString(&cfg.APIPort, lookupEnv(dotEnv, "API_PORT"))
	applyString(
		&cfg.AppAuthLocalPublicKeyFile,
		lookupEnv(dotEnv, "APP_AUTH_LOCAL_PUBLIC_KEY_FILE"),
	)
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
	if cfg.APIPort == "" {
		cfg.APIPort = "8080"
	}
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = "pan_session"
	}
	if cfg.AdminUsername == "" {
		cfg.AdminUsername = "admin"
	}
	if cfg.MaxUploadBytes <= 0 {
		cfg.MaxUploadBytes = 20 * 1024 * 1024
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

	mounts, err := LoadMountDefinitions()
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
	cfg.Mounts, err = resolveMounts(configBaseDir, cfg.Mounts)
	if err != nil {
		return cfg, err
	}

	if strings.TrimSpace(cfg.SessionSecret) == "" {
		return cfg, fmt.Errorf("WEB_SESSION_SECRET is required")
	}
	if strings.TrimSpace(cfg.AdminPasswordHash) == "" {
		return cfg, fmt.Errorf("AUTH_PASSWORD_HASH_BCRYPT is required")
	}

	absDataDir, err := resolvePathAgainstBase(configBaseDir, cfg.DataDir)
	if err != nil {
		return cfg, fmt.Errorf("resolve data dir: %w", err)
	}
	cfg.DataDir = absDataDir
	resolvedPublicKeyFile, err := resolveLocalPublicKeyFile(
		cfg.AppAuthLocalPublicKeyFile,
		configBaseDir,
	)
	if err != nil {
		return cfg, err
	}
	cfg.AppAuthLocalPublicKeyFile = resolvedPublicKeyFile
	return cfg, nil
}

func LoadMountDefinitions() ([]Mount, error) {
	_, envBaseDir, err := loadDotEnv()
	if err != nil {
		return nil, err
	}
	configBaseDir, err := configBaseDir(envBaseDir)
	if err != nil {
		return nil, err
	}
	mounts, err := loadMountFiles(filepath.Join(configBaseDir, "configs", "mounts"))
	if err != nil {
		return nil, err
	}
	return resolveMounts(configBaseDir, mounts)
}

func configBaseDir(envBaseDir string) (string, error) {
	baseDir := strings.TrimSpace(envBaseDir)
	if baseDir == "" {
		cwd, err := os.Getwd()
		if err != nil {
			return "", err
		}
		baseDir = cwd
	}
	return filepath.Abs(baseDir)
}

func applyString(dst *string, v string) {
	if v != "" {
		*dst = v
	}
}

func lookupEnv(dotEnv map[string]string, key string) string {
	if value, ok := os.LookupEnv(key); ok {
		if normalized := normalizeEnvValue(value); normalized != "" {
			return normalized
		}
	}
	return normalizeEnvValue(dotEnv[key])
}

func normalizeEnvValue(value string) string {
	return trimQuotes(strings.TrimSpace(value))
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

func resolveLocalPublicKeyFile(rawPath, configBaseDir string) (string, error) {
	resolved, err := resolvePathAgainstBase(configBaseDir, rawPath)
	if err != nil {
		return "", err
	}
	if resolved == "" {
		return "", nil
	}
	payload, err := os.ReadFile(resolved)
	if err != nil {
		return "", fmt.Errorf("read app auth local public key file %s: %w", resolved, err)
	}
	if _, err := parseRSAPublicKeyPEM(payload); err != nil {
		return "", fmt.Errorf("parse app auth local public key file %s: %w", resolved, err)
	}
	return resolved, nil
}

func resolvePathAgainstBase(baseDir, rawPath string) (string, error) {
	trimmed := strings.TrimSpace(rawPath)
	if trimmed == "" {
		return "", nil
	}
	if filepath.IsAbs(trimmed) {
		return filepath.Clean(trimmed), nil
	}
	return filepath.Abs(filepath.Join(baseDir, trimmed))
}

func resolveMounts(configBaseDir string, mounts []Mount) ([]Mount, error) {
	result := make([]Mount, 0, len(mounts))
	for i := range mounts {
		mount := mounts[i]
		if strings.TrimSpace(mount.Path) == "" && strings.TrimSpace(mount.Source) != "" {
			mount.Path = mount.Source
		}
		if mount.ID == "" {
			mount.ID = fmt.Sprintf("mount-%d", i+1)
		}
		if mount.Name == "" {
			mount.Name = mount.ID
		}
		resolvedSource, err := resolvePathAgainstBase(configBaseDir, mount.Source)
		if err != nil {
			return nil, fmt.Errorf("resolve mount %s source: %w", mount.ID, err)
		}
		resolvedPath, err := resolvePathAgainstBase(configBaseDir, mount.Path)
		if err != nil {
			return nil, fmt.Errorf("resolve mount %s: %w", mount.ID, err)
		}
		if strings.TrimSpace(resolvedPath) == "" {
			return nil, fmt.Errorf("mount %s path is required", mount.ID)
		}
		mount.Source = resolvedSource
		mount.Path = resolvedPath
		result = append(result, mount)
	}
	return result, nil
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
