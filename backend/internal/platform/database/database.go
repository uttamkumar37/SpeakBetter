// Package database owns connections and dependency readiness, not feature SQL.
package database

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const SchemaVersion = 1

type DB struct{ Pool *pgxpool.Pool }

func Open(ctx context.Context, connectionString string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(connectionString)
	if err != nil {
		return nil, errors.New("DATABASE_URL is invalid")
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.ConnConfig.ConnectTimeout = 3 * time.Second
	cfg.ConnConfig.RuntimeParams["timezone"] = "UTC"
	cfg.ConnConfig.RuntimeParams["statement_timeout"] = "10000"
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, errors.New("could not initialize database pool")
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, errors.New("database is unreachable; check DATABASE_URL and server availability")
	}
	return &DB{Pool: pool}, nil
}

// Ready checks both connectivity and schema compatibility on every probe.
func (db *DB) Ready(ctx context.Context) error {
	var version int
	var dirty bool
	if err := db.Pool.QueryRow(ctx, "SELECT version, dirty FROM schema_migrations").Scan(&version, &dirty); err != nil {
		return errors.New("database schema is unavailable")
	}
	if version != SchemaVersion || dirty {
		return errors.New("database schema migration is required")
	}
	return nil
}
