package config

import (
	"bufio"
	"embed"
	"encoding/json"
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
	AppPort           string  `json:"app_port"`
	WebPort           string  `json:"web_port"`
	WebOrigin         string  `json:"web_origin"`
	AppPublicKeyFile  string  `json:"auth_app_public_key_file"`
	StaticDir         string  `json:"pan_static_dir"`
	DataDir           string  `json:"pan_data_dir"`
	SessionCookieName string  `json:"session_cookie_name"`
	SessionSecret     string  `json:"-"`
	AdminUsername     string  `json:"-"`
	AdminPasswordHash string  `json:"-"`
	MaxUploadBytes    int64   `json:"max_upload_bytes"`
	MaxEditFileBytes  int64   `json:"max_edit_file_bytes"`
	Mounts            []Mount `json:"mounts"`
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

	dotEnv, err := loadDotEnv(".env")
	if err != nil {
		return cfg, err
	}

	applyString(&cfg.AppPort, lookupEnv(dotEnv, "APP_PORT"))
	applyString(&cfg.WebPort, lookupEnv(dotEnv, "WEB_PORT"))
	applyString(&cfg.WebOrigin, lookupEnv(dotEnv, "WEB_ORIGIN"))
	applyString(&cfg.AppPublicKeyFile, lookupEnv(dotEnv, "AUTH_APP_PUBLIC_KEY_FILE"))
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
	if cfg.AppPort == "" {
		cfg.AppPort = "8080"
	}
	if cfg.WebPort == "" {
		cfg.WebPort = "5173"
	}
	if cfg.WebOrigin == "" {
		cfg.WebOrigin = localOrigin(cfg.WebPort)
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
	if cfg.AppPublicKeyFile == "" {
		cfg.AppPublicKeyFile = "./configs/local-public-key.pem"
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
	absPublicKeyFile, err := filepath.Abs(cfg.AppPublicKeyFile)
	if err != nil {
		return cfg, fmt.Errorf("resolve app public key file: %w", err)
	}
	if stat, err := os.Stat(absPublicKeyFile); err != nil {
		if os.IsNotExist(err) {
			return cfg, fmt.Errorf("app public key file does not exist: %s", absPublicKeyFile)
		}
		return cfg, fmt.Errorf("stat app public key file: %w", err)
	} else if stat.IsDir() {
		return cfg, fmt.Errorf("app public key file is a directory: %s", absPublicKeyFile)
	}
	cfg.AppPublicKeyFile = absPublicKeyFile
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
		return value
	}
	return dotEnv[key]
}

func loadDotEnv(path string) (map[string]string, error) {
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]string{}, nil
		}
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer file.Close()

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
		return nil, fmt.Errorf("scan %s: %w", path, err)
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
