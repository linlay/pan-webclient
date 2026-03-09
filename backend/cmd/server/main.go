package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"pan-webclient/backend/internal/app"
	"pan-webclient/backend/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if err := app.EnsureRuntimeDirs(cfg); err != nil {
		log.Fatalf("prepare runtime dirs: %v", err)
	}
	server, err := app.New(cfg)
	if err != nil {
		log.Fatalf("build app: %v", err)
	}

	go func() {
		if err := server.Run(); err != nil {
			log.Fatalf("run server: %v", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}
