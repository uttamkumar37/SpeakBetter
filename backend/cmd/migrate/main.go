package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/uttamkumar37/SpeakBetter/backend/migrations"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	connectionString := os.Getenv("DATABASE_URL")
	if connectionString == "" {
		logger.Error("DATABASE_URL is required")
		os.Exit(1)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := migrations.Up(ctx, connectionString); err != nil {
		logger.Error("migration stopped", "error", err)
		os.Exit(1)
	}
	logger.Info("database migrations are current")
}
