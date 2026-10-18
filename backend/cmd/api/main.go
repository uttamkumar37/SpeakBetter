package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/uttamkumar37/SpeakBetter/backend/internal/config"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/httpapi"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/interview"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/database"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/storage"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/practice"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("api stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	var readiness func(context.Context) error
	var db *database.DB
	if cfg.DatabaseURL != "" {
		db, err = database.Open(ctx, cfg.DatabaseURL)
		if err != nil {
			return err
		}
		defer db.Pool.Close()
		readiness = db.Ready
	}
	router := httpapi.New(logger, cfg.AllowedOrigins, readiness)
	if db != nil {
		var store storage.RecordingStore
		if cfg.StorageBackend == "r2" {
			store, err = storage.NewR2(cfg.R2Endpoint, cfg.R2Bucket, cfg.R2AccessKey, cfg.R2Secret)
		} else {
			var local *storage.Local
			local, err = storage.NewLocal(cfg.StoragePath)
			if err == nil {
				store = local
				defer local.Close()
			}
		}
		if err != nil {
			return err
		}
		practiceService := &practice.Service{Pool: db.Pool, Storage: store, RetentionDays: cfg.RetentionDays}
		practice.Register(router, practiceService, cfg.MaxUploadBytes)
		interviewService := &interview.Service{Pool: db.Pool, Storage: store, RetentionDays: cfg.RetentionDays}
		interview.Register(router, interviewService, cfg.MaxUploadBytes)
		workerDone := make(chan struct{})
		go func() {
			defer close(workerDone)
			ticker := time.NewTicker(time.Minute)
			defer ticker.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					cleanupCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
					if err := practiceService.Cleanup(cleanupCtx); err != nil {
						logger.Error("recording cleanup failed; will retry")
					}
					if err := interviewService.Cleanup(cleanupCtx); err != nil {
						logger.Error("interview recording cleanup failed; will retry")
					}
					cancel()
				}
			}
		}()
		defer func() { stop(); <-workerDone }()
	}
	server := &http.Server{
		Addr: cfg.Address, Handler: router,
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Minute,
		WriteTimeout: 10 * time.Minute, IdleTimeout: 60 * time.Second,
		MaxHeaderBytes: 16 * 1024,
	}
	errCh := make(chan error, 1)
	go func() { errCh <- server.ListenAndServe() }()
	logger.Info("api starting", "address", cfg.Address)
	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		logger.Info("api shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			_ = server.Close()
			return err
		}
		if err := <-errCh; !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	}
}
