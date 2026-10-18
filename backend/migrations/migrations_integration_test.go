package migrations_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/url"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/database"
	"github.com/uttamkumar37/SpeakBetter/backend/migrations"
)

// Each run owns a randomly named disposable database; it never drops caller data.
func TestPostgresMigrationsAndReadiness(t *testing.T) {
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Skip("set TEST_DATABASE_URL to an isolated PostgreSQL instance with CREATEDB permission")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	admin, err := pgx.Connect(ctx, base)
	if err != nil {
		t.Fatal("connect test database:", err)
	}
	defer admin.Close(context.Background())
	var id [8]byte
	_, _ = rand.Read(id[:])
	name := "speakbetter_v2_test_" + hex.EncodeToString(id[:])
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+pgx.Identifier{name}.Sanitize()); err != nil {
		t.Fatal(err)
	}
	defer func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cleanupCancel()
		if _, err := admin.Exec(cleanupCtx, "DROP DATABASE "+pgx.Identifier{name}.Sanitize()); err != nil {
			t.Error(err)
		}
	}()
	u, err := url.Parse(base)
	if err != nil {
		t.Fatal(err)
	}
	u.Path = "/" + name
	dsn := u.String()
	db, err := database.Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Pool.Close()
	if err := db.Ready(ctx); err == nil {
		t.Fatal("empty schema should not be ready")
	}
	if err := migrations.Up(ctx, dsn); err != nil {
		t.Fatal(err)
	}
	if err := migrations.Up(ctx, dsn); err != nil {
		t.Fatal("repeated migration failed:", err)
	}
	if err := db.Ready(ctx); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='practice_sessions'`).Scan(&count); err != nil || count != 13 {
		t.Fatalf("practice column parity: %d, %v", count, err)
	}
	if _, err := db.Pool.Exec(ctx, `INSERT INTO interview_sessions
		(id,role,level,category,question_id,question_text_snapshot,status,transcript_status,analysis_status,created_at,updated_at,expires_at)
		VALUES ('00000000-0000-4000-8000-000000000001','GENERAL','ENTRY','BEHAVIORAL','question','Original question','CREATED','NOT_CONFIGURED','NOT_CONFIGURED',now(),now(),now()+interval '30 days')`); err != nil {
		t.Fatal("pre-recording null compatibility:", err)
	}
	if _, err := db.Pool.Exec(ctx, "UPDATE schema_migrations SET dirty=true"); err != nil {
		t.Fatal(err)
	}
	if err := db.Ready(ctx); err == nil {
		t.Fatal("dirty migration should fail readiness")
	}
	if _, err := db.Pool.Exec(ctx, "DROP TABLE schema_migrations"); err != nil {
		t.Fatal(err)
	}
	if err := migrations.Up(ctx, dsn); err == nil {
		t.Fatal("must refuse an existing unmanaged schema")
	}
	canceled, stop := context.WithCancel(ctx)
	stop()
	if err := db.Ready(canceled); err == nil {
		t.Fatal("must respect canceled context")
	}
}
