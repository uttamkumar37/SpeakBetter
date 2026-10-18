# Local development

The root `docker-compose.yml` runs the Go API, explicit migrator, PostgreSQL, and React frontend. The single backend is `backend/`. Existing application backups are kept separately on `backup-V0`; do not reuse an original database/media volume for development validation.

## Docker on macOS

Start Docker Desktop, then from the root:

```bash
sh scripts/setup-v2.sh
set -a
. ./.env.v2
set +a
docker compose up --build -d
docker compose ps
docker compose logs -f
docker compose down
```

The generated `.env.v2` is private (0600), ignored by Git, and never overwritten by setup. Reload it in each terminal and keep its password for the lifetime of the persistent database. Frontend: `http://localhost:5173`; API: `http://127.0.0.1:8081`. PostgreSQL is internal. Migration completion precedes API startup; readiness requires a clean compatible schema. nginx sends browser `/api/` requests and media ranges to Go on the same origin. Localhost provides the secure browser context needed for camera/microphone APIs.

`down` retains volumes. Do not add `-v`, prune data, or delete environment credentials while the database is still in use. To change ports, export `FRONTEND_PORT=5174` and/or `API_PORT=8082` before starting. API/frontend use non-root UIDs, read-only root filesystems and bounded resources. Recording and multipart temporary data live on the persistent `/data` volume.

## Podman

A Compose provider is required. Start the existing machine rather than replacing it:

```bash
podman machine start
sh scripts/setup-v2.sh
set -a
. ./.env.v2
set +a
podman compose up --build -d
podman compose ps
podman compose logs -f
podman compose down
```

Podman delegates to `podman-compose` or Docker Compose. Explicit Compose health checks support OCI builds where Dockerfile HEALTHCHECK is ignored. Provider support for healthy/completed dependency conditions and resource controls must be checked. If conditions are unsupported, start PostgreSQL, wait for health, run `podman compose run --rm migrate`, then start API/frontend. In this execution environment the VM sometimes stopped between tool calls; validation restarted the same VM without modifying unrelated resources.

## Native Go and Vite

Provide a separate PostgreSQL database. Credentials must be URL-encoded if constructing a DSN manually.

```bash
cd backend
export DATABASE_URL='postgres://localhost/speakbetter_v2?sslmode=disable'
go run ./cmd/migrate
GIN_MODE=release go run ./cmd/api
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Go defaults to loopback:8081. Vite uses http://localhost:8081 unless `VITE_API_BASE_URL` overrides it. Container builds use an empty API base URL for same-origin proxying. A missing database allows liveness but readiness returns 503; an explicitly configured unreachable database fails startup safely. Migrations never run automatically during API startup.

Configuration: `HOST`, `PORT`, `DATABASE_URL`, exact `CORS_ALLOWED_ORIGINS`, `RECORDING_STORAGE_PATH`, `RECORDING_RETENTION_DAYS` (30), `MAX_UPLOAD_BYTES` (500 MiB). Optional private R2: `STORAGE_BACKEND=r2`, `R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Generated Compose passwords are hexadecimal to avoid DSN escaping ambiguity. Use the managed provider's TLS settings for external databases; disabled TLS is local-only.

## Tests

```bash
cd backend
TEST_DATABASE_URL="$DATABASE_URL" go test -race -count=1 ./...
go vet ./...
go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 ./...
cd ../frontend
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Integration tests require CREATEDB on an isolated server. They own only randomly named disposable databases. Without `TEST_DATABASE_URL` they skip explicitly; that does not validate persistence. The production application account should not have CREATEDB privileges.

After starting the containers, `python3 scripts/smoke.py` checks the built frontend/API using generated disposable WAV fixtures, then deletes its own sessions and media. `npm run test:e2e` exercises desktop and mobile browser journeys with Playwright; configure generated camera/audio devices as shown in `playwright.config.ts`. The automated suites do not access personal camera/microphone hardware or send content to AI providers.

This local milestone has no public authentication/authorization. Anyone who reaches the API can access its personal media, so bindings are loopback-only. Transcription, AI coaching, independent learning retention and Kubernetes release validation remain pending.
