# SpeakBetter

A personal speaking-practice application with a Go API, PostgreSQL, and React/TypeScript frontend.

Record → Review → Improve → Repeat.

The active branch contains one backend at `backend/`. The original application is preserved on [`backup-V0`](https://github.com/uttamkumar37/SpeakBetter/tree/backup-V0). The Go backend supports the existing practice and interview API contracts. Automatic transcription, AI sentence feedback, persistent learning plans, and Kubernetes deployment are still pending; unavailable analysis is never replaced with invented results.

## Run locally

With Docker Desktop running, from the repository root:

```bash
sh scripts/setup-v2.sh
set -a
. ./.env.v2
set +a
docker compose up --build -d
docker compose ps
docker compose logs -f
```

Open **http://localhost:5173**. The API listens at **http://127.0.0.1:8081**. PostgreSQL stays inside the container network. Setup creates a private, ignored `.env.v2` with a random database password; keep and reload this file in each new terminal. To stop while retaining data:

```bash
docker compose down
```

For Podman, start the existing VM with `podman machine start`, load the same environment, and replace `docker compose` with `podman compose`. A Compose provider is required. Do not remove volumes or reuse storage from an existing installation. See [local development](docs/v2/05-local-development.md) for native Go, resource limits, R2 settings, and troubleshooting.

## Implemented

- Browser recording with preview, countdown, device selection, retake and save.
- Topic guides, stand-up practice, grouped recording history and attempt comparison.
- Original, audio-only and muted video review using the original recording.
- Manual strengths, improvement notes, filler counts, and progress counts/time.
- Eight reviewed interview questions with role/level/category filtering, question snapshots, interview history and self-review.
- Local storage and a configurable private Cloudflare R2 adapter.
- Generated storage keys, actual container-signature checks, bounded uploads, safe paths, HTTP Range/HEAD playback, deletion and configurable 30-day retention.
- Explicit PostgreSQL migrations, health/readiness, safe structured errors, request IDs, timeouts and graceful shutdown.

Audio-only capture and text practice are not yet exposed by the UI. Audio containers are accepted by the backend. Interview WPM/filler/structure metrics require a real stored transcript. The existing frontend's duration-based heuristic is retained for compatibility and must still be replaced with evidence-supported language metrics.

This is currently a single-user local application. Authentication and private-media authorization must be completed before public deployment. Compose binds application ports to loopback.

## Project layout

```text
backend/
  cmd/api/              HTTP server and cleanup loop
  cmd/migrate/          Explicit migration command
  internal/config/      Validated environment configuration
  internal/httpapi/     Routing, common errors and request helpers
  internal/platform/    PostgreSQL pool and local/R2 storage
  internal/practice/    Practice sessions and manual reviews
  internal/interview/   Catalog, sessions and deterministic metrics
  internal/recording/   Shared upload and streaming behavior
  migrations/           Embedded versioned SQL
frontend/               React, TypeScript, Vite and Vitest
scripts/                Local environment setup
docs/v2/                Audit, roadmap, learning guide and verification
docker-compose.yml      Go API, migrator, frontend and PostgreSQL
```

## Native development

Provide a separate empty PostgreSQL database, then:

```bash
cd backend
export DATABASE_URL='postgres://localhost/speakbetter_v2?sslmode=disable'
go run ./cmd/migrate
GIN_MODE=release go run ./cmd/api
```

Adjust the URL for your PostgreSQL user/password. In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

The development frontend defaults to API port 8081; container builds use same-origin `/api/` proxying. Set `VITE_API_BASE_URL` at build time for other hosts.

## Tests

```bash
cd backend
go test -race ./...
go vet ./...
TEST_DATABASE_URL="$DATABASE_URL" go test -race -count=1 ./...
go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 ./...
cd ../frontend
npm ci
npm test
npm run lint
npm run build
```

Database integration tests create/drop only randomly named disposable databases and need CREATEDB permission on an isolated server. They explicitly skip when `TEST_DATABASE_URL` is absent. Never use production credentials for them.

## Configuration and API

Important environment variables: `DATABASE_URL`, `HOST` (127.0.0.1), `PORT` (8081), `CORS_ALLOWED_ORIGINS` (http://localhost:5173), `RECORDING_STORAGE_PATH`, `RECORDING_RETENTION_DAYS` (30), and `MAX_UPLOAD_BYTES` (500 MiB). Set `STORAGE_BACKEND=r2`, `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` for a private R2 bucket. Secrets belong in environment variables or private ignored files.

| Resource | Routes |
|---|---|
| Health | GET `/api/v2/health/live`, `/api/v2/health/ready` |
| Practice | POST/GET `/api/practice-sessions`; GET/DELETE `/{id}`; PUT `/{id}/review`; GET/HEAD `/{id}/video` |
| Questions | GET `/api/interview-questions` with optional role/level/category; GET `/{id}` |
| Interviews | POST/GET `/api/interview-sessions`; GET/DELETE `/{id}`; POST `/{id}/recording`; PUT `/{id}/review`; GET/HEAD `/{id}/video` |

Practice uploads use multipart `video`, `topic`, `durationSeconds`. Interview creation uses role/level/category/questionId JSON; its confirmed recording is uploaded separately. Collections retain JSON arrays and relative media URLs. Review fields are nullable and PUT replaces them. Current retention removes expired media **and session metadata**; separate long-term learning history is a future stage.

See the [implementation audit](docs/v2/01-existing-system-audit.md), [roadmap](docs/v2/02-migration-plan.md), [Go learning guide](docs/v2/03-go-learning-guide.md), [verification log](docs/v2/04-delivery-log.md), and [backup/rollback record](docs/v2/00-backup-and-rollback.md).
