// Package migrations embeds forward migrations so binaries work from any folder.
package migrations

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"time"

	"github.com/golang-migrate/migrate/v4"
	pgxmigrate "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

//go:embed *.up.sql
var files embed.FS

// Up refuses unmanaged existing databases. Restore/import is a separate gate.
func Up(ctx context.Context, connectionString string) error {
	cfg, err := pgx.ParseConfig(connectionString)
	if err != nil {
		return errors.New("DATABASE_URL is invalid")
	}
	cfg.ConnectTimeout = 3 * time.Second
	db := stdlib.OpenDB(*cfg)
	defer db.Close()
	if err := refuseUnknownSchema(ctx, db); err != nil {
		return err
	}
	source, err := iofs.New(files, ".")
	if err != nil {
		return fmt.Errorf("open embedded migrations: %w", err)
	}
	driver, err := pgxmigrate.WithInstance(db, &pgxmigrate.Config{StatementTimeout: 15 * time.Second})
	if err != nil {
		return errors.New("could not initialize migration ledger")
	}
	m, err := migrate.NewWithInstance("iofs", source, "pgx5", driver)
	if err != nil {
		return errors.New("could not initialize migration runner")
	}
	defer m.Close()
	m.LockTimeout = 10 * time.Second
	err = m.Up()
	if errors.Is(err, migrate.ErrNoChange) {
		return nil
	}
	if err != nil {
		return errors.New("migration failed; inspect the schema ledger before retrying")
	}
	return nil
}

func refuseUnknownSchema(ctx context.Context, db *sql.DB) error {
	var existing, ledger bool
	err := db.QueryRowContext(ctx, `SELECT
		EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE' AND table_name <> 'schema_migrations'),
		to_regclass('schema_migrations') IS NOT NULL`).Scan(&existing, &ledger)
	if err != nil {
		return errors.New("could not inspect database schema")
	}
	if existing && !ledger {
		return errors.New("refusing an existing unmanaged database; use a separate empty database")
	}
	return nil
}
