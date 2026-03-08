package config

import (
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
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
	WebOrigin         string  `json:"web_origin"`
	StaticDir         string  `json:"pan_static_dir"`
	DataDir           string  `json:"pan_data_dir"`
	SessionCookieName string  `json:"session_cookie_name"`
	SessionSecret     string  `json:"-"`
	TokenSigningKey   string  `json:"-"`
	AdminUsername     string  `json:"-"`
	AdminPassword     string  `json:"-"`
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

	applyString(&cfg.AppPort, os.Getenv("APP_PORT"))
	applyString(&cfg.WebOrigin, os.Getenv("WEB_ORIGIN"))
	applyString(&cfg.StaticDir, os.Getenv("PAN_STATIC_DIR"))
	applyString(&cfg.DataDir, os.Getenv("PAN_DATA_DIR"))
	applyString(&cfg.SessionCookieName, os.Getenv("SESSION_COOKIE_NAME"))
	applyString(&cfg.SessionSecret, os.Getenv("WEB_SESSION_SECRET"))
	applyString(&cfg.TokenSigningKey, os.Getenv("APP_TOKEN_SIGNING_KEY"))
	applyString(&cfg.AdminUsername, os.Getenv("PAN_ADMIN_USERNAME"))
	applyString(&cfg.AdminPassword, os.Getenv("PAN_ADMIN_PASSWORD"))

	if v := os.Getenv("MAX_UPLOAD_BYTES"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			cfg.MaxUploadBytes = parsed
		}
	}
	if v := os.Getenv("MAX_EDIT_FILE_BYTES"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			cfg.MaxEditFileBytes = parsed
		}
	}
	if v := os.Getenv("PAN_MOUNTS"); v != "" {
		mounts, err := parseMounts(v)
		if err != nil {
			return cfg, err
		}
		cfg.Mounts = mounts
	}

	if cfg.AppPort == "" {
		cfg.AppPort = "8080"
	}
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = "pan_session"
	}
	if cfg.SessionSecret == "" {
		cfg.SessionSecret = "pan_dev_session_secret"
	}
	if cfg.TokenSigningKey == "" {
		cfg.TokenSigningKey = "pan_dev_token_secret"
	}
	if cfg.AdminUsername == "" {
		cfg.AdminUsername = "admin"
	}
	if cfg.AdminPassword == "" {
		cfg.AdminPassword = "change_me"
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
	if len(cfg.Mounts) == 0 {
		cfg.Mounts = []Mount{{ID: "workspace", Name: "Workspace", Path: "."}}
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
	return cfg, nil
}

func applyString(dst *string, v string) {
	if strings.TrimSpace(v) != "" {
		*dst = strings.TrimSpace(v)
	}
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
