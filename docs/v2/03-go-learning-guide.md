# Go implementation learning guide

The application has one backend in `backend/`. Each step below explains a working boundary, its code, important Go syntax, and how to verify it. The roadmap distinguishes implemented parity from future English-coaching features.

## 1. Start a process and answer HTTP requests

`backend/go.mod` names the module `github.com/uttamkumar37/SpeakBetter/backend` and pins Go 1.27.2, verified against [the official stable release feed](https://go.dev/dl/?mode=json). `go.sum` verifies downloaded dependency contents. `go mod tidy` keeps direct and transitive dependencies consistent.

`cmd/api/main.go` is an executable because it declares `package main` and `func main()`. Each other directory is a package. Go enforces the `internal/` boundary so other projects cannot import private implementation packages.

`internal/config.Load` returns `(Config, error)`. A `struct` groups typed fields; capitalized names are exported. `cfg, err := ...` declares and assigns variables. Errors are ordinary returned values: check `if err != nil` and stop or recover deliberately. `Load` receives an environment lookup function; production supplies `os.Getenv`, while tests supply a map lookup. This is dependency injection through function arguments.

`httpapi.New` constructs the Gin router. A handler receives `*gin.Context`, a pointer to the current request context. `router.GET(path, handler)` registers a function. Middleware calls `c.Next()` to continue the chain and can execute code before and after it. `AbortWithStatusJSON` stops the chain with a safe error. A field tag such as `json:"requestId"` controls JSON naming.

| Import | Purpose |
|---|---|
| `github.com/gin-gonic/gin` | Routing, middleware, request/response context and JSON |
| `net/http` | Server, request/response constants, body limits and streaming |
| `context` | Cancellation and deadlines passed to downstream work |
| `log/slog` | Structured JSON logging |
| `os`, `os/signal`, `syscall` | Environment, exit status and process termination signals |
| `time` | Typed durations, timestamps, timers and elapsed time |
| `errors`, `fmt` | Recognize wrapped errors and construct safe errors/keys |
| `net`, `net/url` | Safe host/port construction and origin/endpoint validation |
| `strconv`, `strings` | Numeric configuration parsing and text normalization |
| `crypto/rand`, `encoding/hex`, `regexp` | Random request IDs and bounded request/key syntax |

Request logs include route templates and request IDs, not queries, recording content or signed URLs. CORS checks exact origins; it does not authenticate anyone. `defer` schedules cleanup on function return. Recovery catches unexpected panics and returns a generic 500; ordinary validation uses returned errors, not panic.

The listener runs in one goroutine (`go func(){...}()`) while main waits on `select` for an error or OS cancellation. A buffered `chan error` transports the listener result. `signal.NotifyContext` reacts to Ctrl-C/SIGTERM. `Shutdown` allows ten seconds for in-flight requests, then closes remaining connections. The cleanup goroutine receives the same shutdown signal, closes its completion channel, and exits before the database pool is closed. Goroutines must have an explicit end condition.

```bash
cd backend
go test -race ./internal/config ./internal/httpapi
go vet ./...
GIN_MODE=release go run ./cmd/api
```

Without `DATABASE_URL`, GET `http://127.0.0.1:8081/api/v2/health/live` returns 200/alive, and `/ready` returns 503. This is honest dependency availability. Missing routes return JSON 404 and invalid methods 405. Ctrl-C exits cleanly. Default host is loopback, port 8081, and allowed browser origin http://localhost:5173.

Common mistakes: running outside the module directory, ignoring errors, treating panic as validation, allowing wildcard origins, logging private URL data, or assuming a listening process means its database is ready.

## 2. Connect to PostgreSQL and apply versioned SQL

`internal/platform/database` wraps `pgxpool.Pool`. A bounded pool reuses connections; it does not open one per request. `Open(ctx, connectionString)` validates settings and performs a bounded connection attempt. `(db *DB) Ready(ctx)` is a method receiver: the method acts on that DB value. Its `QueryRow(...).Scan(&version, &dirty)` passes addresses into which pgx decodes typed columns. It checks schema version and dirty state on each readiness request, under a two-second deadline.

New imports: `pgx/v5/pgxpool` manages pooling; `pgx/v5` supplies PostgreSQL types, identifiers and errors. `pgx/v5/stdlib` adapts pgx to `database/sql` only at the migration library boundary. `golang-migrate/migrate/v4`, `database/pgx/v5` and `source/iofs` apply numbered SQL using a separate ledger and advisory lock. `embed` plus `//go:embed` includes SQL in the binary, so the command works independently of its current directory.

`migrations/000001_v1_compatible.up.sql` bootstraps the two session tables with existing REST-compatible columns/indexes. Normal API startup does not alter the schema. The runner refuses unmanaged nonempty databases. Repeat execution succeeds with no change; a failed/dirty or incompatible schema fails readiness. Keep schema-changing migration statements immutable and add a new numbered file for subsequent changes.

```bash
export DATABASE_URL='postgres://localhost/speakbetter_v2?sslmode=disable'
go run ./cmd/migrate
go run ./cmd/migrate
GIN_MODE=release go run ./cmd/api
```

Use your actual isolated database credentials. Both migration runs should report that migrations are current. Readiness should now return 200. A configured but unreachable database fails startup with a safe message. Credentials are never included in errors.

Integration tests use `internal/testutil.Database`: create a random private database, register cleanup with `t.Cleanup`, then drop only that owned database after pools close. `pgx.Identifier.Sanitize` quotes generated database identifiers; query values use `$1` parameters rather than interpolation. `net/url` changes only the database component of the test DSN. Test-only DROP operations never target caller-owned databases.

```bash
TEST_DATABASE_URL="$DATABASE_URL" go test -race -count=1 ./migrations
```

Expected: `ok`, including repeat migration, nullable pre-recording interview fields, column compatibility, dirty readiness, unmanaged-schema refusal and cancellation. Missing `TEST_DATABASE_URL` explicitly skips the integration test. Skipping is not persistence validation.

## 3. Store and stream recordings

`internal/platform/storage.RecordingStore` declares `Put`, `Open` and `Delete`. A Go interface describes required methods; a type implements it automatically when its methods match. Both `*Local` and `*R2` satisfy this interface without inheritance. `Stored` carries the generated key/size; `Source` carries a seekable file or signed redirect.

New imports: `io` supplies streaming readers, seek/close contracts, copies and limits; `os` supplies files and `os.Root`; `path` builds portable object keys; `mime`, `bytes`, `strings` and `regexp` normalize/check media declarations, actual signatures and keys. `os.Root` confines filesystem access even when symlinks point outside it. Exclusive file creation avoids overwrites. Deferred cleanup removes partial writes. A context-aware reader stops copying on cancellation. File deletion is idempotent for a valid missing key.

The R2 adapter imports AWS SDK v2 `aws`, `credentials`, `service/s3`, and `smithy-go/transport/http`. The SDK signs actual S3 requests. HEAD checks existence; playback redirects to a signed URL expiring after fifteen minutes. Adapter tests use a local HTTPS server to check upload bytes, authorization, URL expiry, missing objects and deletion. They do not claim a live Cloudflare account test.

`internal/recording` shares HTTP transport. `mime/multipart` parses confirmed uploads, `strconv` checks duration, and the request/file size and temporary memory are bounded. Files use the compatibility field `video`, even for accepted audio containers. Check actual WebM/MP4/Ogg/WAV signatures; never trust the browser filename. A container signature does not certify codecs, tracks, malware safety or pronunciation. `http.ServeContent` provides full/partial/suffix/HEAD playback and 416 for invalid ranges. Size mismatch is reported as corruption.

```bash
go test -race ./internal/platform/storage
```

Expected: `ok` for persistence/ranges/deletion, interrupted writes, path/symlink protection, signatures and simulated R2 behavior. Configure local storage/limits through environment variables documented in the root README. Do not return an unrestricted public bucket URL for personal recordings.

## 4. Persist practice and manual review

`internal/practice.Service` receives the pool, storage interface and retention period as fields. Handlers validate HTTP input and call feature methods. DTO structs use pointers such as `*string` and `*int` so absent values serialize as JSON null rather than an invented empty score/count. `Review.Validate` trims text, converts blank values to nil, bounds lengths and rejects negative counts.

New imports: `github.com/google/uuid` generates/parses UUIDs; `unicode/utf8` counts Unicode code points; `encoding/json` decodes one bounded JSON object. `httpapi.JSON` rejects null, arrays, unknown fields, extra documents and oversized input. Requests propagate `c.Request.Context()` to SQL and storage.

Typed query functions explicitly scan ordered columns into DTOs. This small fixed query set does not yet justify a generator. Iterate `rows.Next()`, handle `Scan` failures, check `rows.Err()`, and always close rows. A missing row is a 404 (`errors.Is(err, pgx.ErrNoRows)`), not a server error. UTC timestamps avoid new local-time ambiguity; stored expiry is creation plus the configured days.

Creation stores media, inserts metadata, and compensates the saved file if the insert fails. Deletion first commits `DELETE_PENDING`, then removes storage and metadata. If storage fails, the tombstone remains for retry. Cleanup selects only expired rows or pending deletes, processes a bounded batch, and continues after per-item failures. Current parity retention removes metadata too; separate long-term learning history is not implemented yet.

```bash
TEST_DATABASE_URL="$DATABASE_URL" go test -race -count=1 ./internal/practice
```

Tests exercise a real PostgreSQL database through HTTP handlers: >1 MiB upload, generated filenames, exact 30-day expiry, list/review, 200/206/416 playback, delete, invalid MIME/topic/duration, review validation, no early cleanup, retryable deletion, and compensation when the database is unavailable. No memory-only repository is substituted for these persistence checks.

## 5. Preserve interview flows and honest metrics

`internal/interview/questions.json` contains the eight reviewed questions. `embed` packages this static catalog, and `encoding/json` reads it into typed structs. `Questions` filters role/level/category while retaining GENERAL questions for requested roles. Validation rejects unknown enums and questions that do not match context. Creation snapshots the actual question text; retired catalog items fall back to that saved text.

Upload uses an atomic SQL predicate `WHERE status='CREATED'`. Two requests can save temporary files concurrently, but only one updates the row to READY; the losing request removes its unused object. This state check must happen in SQL, not only in an earlier application-level read.

`Measure` returns independent duration, pacing, filler and STAR-indicator structures. `math.Round` calculates WPM only with a real transcript and positive duration; `regexp` counts exact filler words; `strings` checks documented STAR keyword indicators. Indicators are heuristics, not comprehension or language-quality judgments. Without a transcript, rates/counts remain nullable and availability says `TRANSCRIPT_REQUIRED`. No transcription, pronunciation or grammar quality is inferred from duration.

```bash
TEST_DATABASE_URL="$DATABASE_URL" go test -race -count=1 ./internal/interview
```

Tests preserve the complete catalog, filter semantics, empty arrays, matching validation, question fallback, concurrent upload winner, manual review, duration boundaries, missing evidence and expiry behavior. Integration test goroutines use a `sync.WaitGroup` to finish and a channel to collect status codes; production does not need one goroutine per stored entity.

## 6. Build and run the complete local parity stack

Backend Docker builds both API and migration binaries, then uses a small CA-enabled runtime as UID 10001/group 0. Frontend Docker builds static Vite assets and serves/proxies them with non-root nginx. Root Compose uses separate persistent V2 volumes, a generated password, an explicit migration service, health checks, resource budgets and loopback application ports. Read-only roots use dedicated writable media/temp storage.

```bash
cd ..
sh scripts/setup-v2.sh
set -a
. ./.env.v2
set +a
docker compose up --build -d
docker compose ps
docker compose logs -f
docker compose down
```

Use `podman compose` equivalently with an installed provider. Keep `.env.v2` and volumes; never use `down -v` to troubleshoot startup. See the local development guide for ports and native Go/Vite. Frontend dev API defaults to 8081; container API calls use the same origin through nginx.

Final checks: `go test -race -count=1 ./...` with a real test DB, `go vet ./...`, `go mod verify`, `govulncheck`, frontend tests/lint/build, then built-container HTTP/upload/range/delete smoke. Race detection finds unsynchronized memory access; it does not replace database concurrency/state tests. A configured CI workflow is not a claimed remote execution.

The next independent slice is real transcription with consent and durable jobs. Do not add placeholder provider results, language scores, learning tables or public-deployment claims to make the remaining roadmap appear complete.
