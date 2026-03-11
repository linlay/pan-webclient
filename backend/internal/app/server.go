package app

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
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

var lookPath = exec.LookPath

func New(cfg config.Config) (*Server, error) {
	if err := ensureAuthDependencies(cfg); err != nil {
		return nil, err
	}

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
		Addr:              ":" + cfg.APIPort,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	return &Server{
		httpServer: server,
	}, nil
}

func ensureAuthDependencies(cfg config.Config) error {
	if strings.TrimSpace(cfg.AdminPasswordHash) == "" {
		return nil
	}
	if _, err := lookPath("htpasswd"); err != nil {
		return fmt.Errorf("web login requires htpasswd in PATH: %w", err)
	}
	return nil
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
	if err := os.MkdirAll(store.TrashItemsDir(), 0o755); err != nil {
		return err
	}
	return os.MkdirAll(store.TasksDir(), 0o755)
}
