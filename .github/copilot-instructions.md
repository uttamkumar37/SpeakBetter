# Repository instructions

SpeakBetter has one Go backend in `backend/` and a React/TypeScript frontend in `frontend/`. Preserve the practice → record → review → understand → retry → compare loop and existing interview flows. The original application is recoverable from the `backup-V0` branch. Do not reintroduce an old backend or create a duplicate backend directory.

## Stack and structure

- Backend: Go (exact version in `backend/go.mod`), Gin, pgx, PostgreSQL, golang-migrate, standard slog/testing/httptest.
- Media: `internal/platform/storage.RecordingStore`, local rooted filesystem and AWS SDK v2 S3-compatible private R2 storage.
- Features: `internal/practice`, `internal/interview`, shared `internal/recording`; entry points in `cmd/api` and `cmd/migrate`.
- Frontend: React, TypeScript, Vite, HashRouter, React Context, plain CSS, Vitest/Testing Library, oxlint.
- Local runtime: root `docker-compose.yml`, separate persistent V2 volumes, same-origin nginx API proxy, non-root API/frontend containers.

Keep the modular monolith. Do not create empty packages, speculative tables, a dependency injection framework, or unnecessary infrastructure. Prefer small typed pgx query functions; keep query/scan column order explicit and covered by integration tests.

## Commands

```bash
cd backend
go test -race ./...
go vet ./...
TEST_DATABASE_URL="$DATABASE_URL" go test -race -count=1 ./...
go run ./cmd/migrate
GIN_MODE=release go run ./cmd/api
```

Migrations run explicitly, never on normal API startup. An empty database is required on first run; never edit applied SQL or point migrations/tests at an existing production database. Integration tests require an isolated PostgreSQL server with CREATEDB permission and own randomly named test databases. Distinguish a skipped test from a passed integration test.

```bash
cd frontend
npm ci
npm test
npm run lint
npm run build
```

From the root, initialize with `sh scripts/setup-v2.sh`, load `.env.v2` with export enabled, then use `docker compose up --build -d` (or `podman compose`). `down` retains volumes; never automatically run `down -v`, prune data, recreate an existing VM, or overwrite environment secrets.

## Contracts and implementation

Preserve `/api/practice-sessions`, `/api/interview-questions`, and `/api/interview-sessions`, JSON field casing/nulls, collection arrays, relative media URLs, multipart field names, and status codes. Introduce versioned learning APIs only for implemented features. Keep handlers thin and feature business behavior in methods. Use small consumer-defined interfaces when replacement is useful. Pass request contexts to SQL/storage/provider operations. Bound HTTP bodies, queries, network calls and shutdown. Handle errors explicitly and close rows/files/pools reliably.

Recording keys must be server-generated and confined to storage. Verify actual container signatures as well as declared MIME, enforce configured request/file caps, remove temporary uploads, support byte ranges, and preserve recordings if analysis fails. Failed database writes must compensate saved media; deletion intent must remain retryable if storage is unavailable. Cleanup must never select future expiry dates.

No authentication is implemented yet. Loopback development and CORS are not public-deployment authorization. Do not claim private-media access control or production readiness. Never expose recordings, SQL credentials, signed URLs, transcripts or user text in logs. Secrets come from environment/private files only.

## Frontend and learning integrity

Keep typed API functions under `frontend/src/api`, shared state in Context, focused functional components, existing indigo styling, responsive layouts and keyboard-accessible controls. Every visible button must perform a real action. Preserve actionable permission/unsupported-browser/network errors and media resource cleanup.

Never fabricate transcripts, grammar issues, scores, pronunciation, confidence, posture, eye contact or success. Metrics must have actual evidence and explicit unavailable states. Duration is practice time, not English ability. Separate deterministic observations, self-reviews and real provider analysis. Optional providers must fail honestly while manual practice remains usable. Preserve intended meaning and distinguish grammar errors from optional style. Accent differences, including Indian English, are not errors.

## Work and attribution

Read existing code, make small testable changes, explain new Go syntax/packages and update docs/checklists with actual validation. Do not leave placeholder implementations or report tests/deployments that did not run. Preserve user changes. Use only the configured human Git identity. Never add AI authors/co-authors, Co-Authored-By trailers or generated-by attribution. Do not automatically commit/push unless explicitly requested, and never rewrite history or force-push without explicit authorization. Read `CLAUDE.md` for existing attribution rules.
