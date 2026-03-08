package app

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"pan-webclient/apps/api/internal/auth"
	"pan-webclient/apps/api/internal/config"
	"pan-webclient/apps/api/internal/fsops"
	"pan-webclient/apps/api/internal/httpapi"
	"pan-webclient/apps/api/internal/indexer"
	"pan-webclient/apps/api/internal/mounts"
	"pan-webclient/apps/api/internal/transfer"
)

type Server struct {
	httpServer *http.Server
	stopSync   func()
}

func New(cfg config.Config) (*Server, error) {
	mountList := mounts.FromConfig(cfg.Mounts)
	resolver := fsops.NewMountResolver(mountList)
	store := indexer.NewStore(cfg.SQLitePath)
	if err := store.Init(); err != nil {
		return nil, err
	}
	syncIndex := func() error {
		for _, mount := range mountList {
			entries, err := fsops.CollectEntries(mount.ID, mount.Path, true)
			if err != nil {
				log.Printf("index mount %s failed: %v", mount.ID, err)
				continue
			}
			if err := store.ReplaceMountSnapshot(mount.ID, entries); err != nil {
				log.Printf("persist mount %s index failed: %v", mount.ID, err)
			}
		}
		return nil
	}
	if err := syncIndex(); err != nil {
		return nil, err
	}
	stopSync := indexer.SyncLoop(cfg.ScanEvery(), syncIndex)

	authManager := auth.NewManager(cfg.SessionSecret, cfg.TokenSigningKey, cfg.AdminUsername, cfg.AdminPassword)
	taskManager := transfer.NewManager(store)
	handler := httpapi.New(httpapi.Dependencies{
		Config:      cfg,
		Resolver:    resolver,
		Store:       store,
		Auth:        authManager,
		TaskManager: taskManager,
	})

	server := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	return &Server{
		httpServer: server,
		stopSync:   stopSync,
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
	if s.stopSync != nil {
		s.stopSync()
	}
	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown http server: %w", err)
	}
	return nil
}

func EnsureRuntimeDirs(cfg config.Config) error {
	if err := os.MkdirAll(cfg.TrashDir, 0o755); err != nil {
		return err
	}
	return os.MkdirAll(indexer.NewStore(cfg.SQLitePath).TasksDir(), 0o755)
}
