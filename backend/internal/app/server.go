package app

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"pan-webclient/backend/internal/auth"
	"pan-webclient/backend/internal/config"
	"pan-webclient/backend/internal/fsops"
	"pan-webclient/backend/internal/httpapi"
	"pan-webclient/backend/internal/indexer"
	"pan-webclient/backend/internal/mounts"
	"pan-webclient/backend/internal/transfer"
)

type Server struct {
	httpServer *http.Server
}

func New(cfg config.Config) (*Server, error) {
	mountList := mounts.FromConfig(cfg.Mounts)
	resolver := fsops.NewMountResolver(mountList)
	store := indexer.NewStore(cfg.DataDir)
	if err := store.Init(); err != nil {
		return nil, err
	}

	appPublicKey, err := auth.LoadRSAPublicKey(cfg.AppAuthLocalPublicKeyFile)
	if err != nil {
		return nil, fmt.Errorf("load app public key: %w", err)
	}
	authManager := auth.NewManager(cfg.SessionSecret, appPublicKey, cfg.AdminUsername, cfg.AdminPasswordHash)
	taskManager := transfer.NewManager(store)
	handler := httpapi.New(httpapi.Dependencies{
		Config:      cfg,
		Resolver:    resolver,
		Store:       store,
		Auth:        authManager,
		TaskManager: taskManager,
	})

	server := &http.Server{
		Addr:              ":" + cfg.PublicPort,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	return &Server{
		httpServer: server,
	}, nil
}

func (s *Server) Run() error {
	log.Printf("pan api listening on %s", s.httpServer.Addr)
	err := s.httpServer.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown http server: %w", err)
	}
	return nil
}

func EnsureRuntimeDirs(cfg config.Config) error {
	store := indexer.NewStore(cfg.DataDir)
	if err := migrateLegacyDir(filepath.Join("apps", "api", "data", "trash"), filepath.Join(cfg.DataDir, "trash")); err != nil {
		return err
	}
	if err := migrateLegacyDir(filepath.Join("apps", "api", "data", "tasks"), filepath.Join(cfg.DataDir, "tasks")); err != nil {
		return err
	}
	if err := os.MkdirAll(store.TrashItemsDir(), 0o755); err != nil {
		return err
	}
	return os.MkdirAll(store.TasksDir(), 0o755)
}

func migrateLegacyDir(oldPath, newPath string) error {
	_, oldErr := os.Stat(oldPath)
	if oldErr != nil {
		if os.IsNotExist(oldErr) {
			return nil
		}
		return oldErr
	}
	if _, err := os.Stat(newPath); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(newPath), 0o755); err != nil {
		return err
	}
	return os.Rename(oldPath, newPath)
}
