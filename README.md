# SpeakBetter

A personal communication-practice app: record yourself speaking on a topic, review the attempt, add a self-review, and track how you improve over time.

**Record → Review → Improve → Repeat**

Every recording is kept for at least 30 days (configurable) and then automatically deleted by a scheduled cleanup job. Nothing about this app requires an AI provider to work — self-review is manual by design, with clean extension points left in place for adding real transcription/analysis later.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running it: option A — plain local (Gradle + npm)](#option-a--plain-local-gradle--npm)
- [Running it: option B — Docker / Podman](#option-b--docker--podman)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Testing](#testing)
- [Deploying it live](#deploying-it-live-optional)
- [Architecture notes](#architecture-notes)

---

## Features

- **Record** via webcam + microphone, with a live preview, optional 3-2-1 countdown, and a running timer
- **Per-topic speaking guides** (Daily Stand-up, Interview Answer/STAR, Technical Explanation, etc.) shown before you record
- **Preview before saving** — retake or save, nothing is uploaded until you choose to save it
- **Practice History**, grouped by topic, so repeat attempts at the same topic sit together ("Attempt 2 of 3")
- **Review Workspace** with tabs: Overview (duration + self-review), Original, Audio Only, Video Only, Transcript, Better Way — the last two show an honest "not available yet" state rather than fabricated AI output
- **Self-review notes**: what went well, what needs improvement, filler word count, free-form notes
- **Progress page** with real, computed-only stats: total attempts, time practiced, attempts per topic
- **Interview Preparation Portal** with role/level/category filters, reviewed static questions, recording preview, interview history, review tabs, deterministic metrics, and explicit unavailable states for transcript/AI features
- **Automatic 30-day retention + cleanup**, running on a schedule, never deleting before `expiresAt`
- Hardened error handling (camera/mic denied, browser unsupported, upload too large, backend unreachable, database failure, missing/corrupted video file) — always a clean message, never a raw stack trace

## Tech stack

**Backend**: Java 21, Spring Boot 3, Gradle, PostgreSQL, Spring Data JPA, Flyway, Spring Scheduler
**Frontend**: React 19, TypeScript, Vite, React Router, plain CSS (no UI framework), Vitest + React Testing Library
**Storage**: local filesystem by default; a Cloudflare R2 (S3-compatible) backend is available for deployment (see [Deploying it live](#deploying-it-live-optional))

No Redux, Kafka, Redis, Kubernetes, or microservices — kept deliberately simple.

## Project structure

```
SpeakBetter/
├── backend/                          Spring Boot API
│   ├── src/main/java/.../
│   │   ├── controller/                REST endpoints (thin - no business logic)
│   │   ├── service/                   Business logic, question catalog, deterministic interview metrics
│   │   │   ├── storage/                RecordingStorage interface + local/R2 implementations
│   │   │   └── analysis/               TranscriptionService/CommunicationAnalysisService
│   │   │                                (interfaces only - unimplemented, for future AI work)
│   │   ├── repository/                Spring Data JPA repository
│   │   ├── entity/                    JPA entities
│   │   ├── dto/                       Request/response DTOs
│   │   ├── config/                    @ConfigurationProperties, CORS
│   │   ├── scheduler/                 30-day cleanup job
│   │   └── exception/                 Global exception handling
│   ├── src/main/resources/
│   │   ├── application.yml            Default (local dev) config
│   │   ├── application-r2.yml         R2 storage config (active under "r2" profile)
│   │   └── db/migration/              Flyway migrations
│   ├── src/test/                      Unit + integration tests
│   ├── Dockerfile
│   └── nixpacks.toml                  Railway build config
├── frontend/                          React + Vite app
│   └── src/
│       ├── pages/                     PracticePage, InterviewPracticePage, HistoryPage, ProgressPage
│       ├── components/                VideoRecorder, TopicSelector, SpeakingGuide, etc.
│       │   └── review/                Review Workspace tabs
│       ├── state/                     Shared session state (React Context)
│       ├── api/                       Backend API client
│       └── utils/                     Formatting, topic guides, grouping logic
├── docker-compose.yml                 Postgres + backend + frontend, one command
└── .github/workflows/                 GitHub Pages deploy workflow
```

---

## Option A — plain local (Gradle + npm)

### Prerequisites
- Java 21
- PostgreSQL running locally
- Node.js 20+

### 1. Create the database (first time only)
```bash
createdb speakbetter
```
The default connection assumes a local Postgres with no password (`jdbc:postgresql://localhost:5432/speakbetter`, your OS username). Override via env vars if yours differs — see [Configuration](#configuration).

### 2. Run the backend
```bash
cd backend
./gradlew bootRun
```
Flyway migrates the schema automatically on startup. API is at `http://localhost:8080`.

### 3. Run the frontend
```bash
cd frontend
npm install
npm run dev
```
App is at `http://localhost:5173`.

Open it, allow camera/microphone access, and start practicing. Recordings persist across restarts (real Postgres + real files on disk).

---

## Option B — Docker / Podman

One command brings up Postgres, the backend, and the frontend together:

```bash
docker compose up --build -d
# or, if using Podman instead of Docker Desktop:
podman compose up --build -d
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- Postgres: `localhost:5432` (user/password/db: `speakbetter`)

Recordings are stored in a named volume (`recordings-data`), so they survive `docker compose down` / `up` — only `docker compose down -v` wipes them.

```bash
docker compose logs -f       # watch logs
docker compose down          # stop everything, keep data
docker compose down -v       # stop everything, delete all data
```

If you run this alongside option A, stop the plain local processes first (they'll fight over ports 5432/8080/5173):
```bash
lsof -ti:8080,5173 | xargs kill
brew services stop postgresql@16   # macOS/Homebrew Postgres
```

---

## Configuration

All backend settings are environment-variable overridable — nothing needs a code change to reconfigure.

| Env var | Default | Purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/speakbetter` | Database connection |
| `SPRING_DATASOURCE_USERNAME` (or `DB_USERNAME`) | `uttamkumar` | Database username - **override this if your local Postgres user is different** |
| `SPRING_DATASOURCE_PASSWORD` (or `DB_PASSWORD`) | *(empty)* | Database password |
| `PORT` | `8080` | Port the backend listens on |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated list of origins allowed to call the API |
| `SPRING_PROFILES_ACTIVE` | *(none)* | Set to `r2` to switch video storage to Cloudflare R2 |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | *(required only when `r2` profile is active)* | Cloudflare R2 credentials |
| `AI_TRANSCRIPTION_ENABLED` | `false` | Enables a real transcription provider only when implemented and configured |
| `AI_TRANSCRIPTION_PROVIDER` | *(empty)* | Name of the server-side transcription provider |
| `AI_TRANSCRIPTION_MODEL` | *(empty)* | Transcription model identifier |
| `AI_ANALYSIS_ENABLED` | `false` | Enables a real AI interview-analysis provider only when implemented and configured |
| `AI_ANALYSIS_PROVIDER` | *(empty)* | Name of the server-side AI analysis provider |
| `AI_ANALYSIS_MODEL` | *(empty)* | AI analysis model identifier |

Recording behavior lives in `backend/src/main/resources/application.yml` under `app.recordings`:

| Property | Default | Purpose |
|---|---|---|
| `app.recordings.storage-path` | `./data/recordings` | Local disk storage root (ignored when `r2` profile is active) |
| `app.recordings.retention-days` | `30` | How long a recording is kept before automatic cleanup |
| `app.recordings.max-upload-size-bytes` | `524288000` (500MB) | Max accepted upload size |
| `app.recordings.cleanup-cron` | `0 0 3 * * *` | When the cleanup job runs (daily at 3am by default) |
| `app.recordings.allowed-mime-types` | `video/webm,video/mp4,video/ogg` | Accepted video MIME types |

Frontend: `VITE_API_BASE_URL` (build-time env var) sets the backend URL; defaults to `http://localhost:8080` for `npm run dev`.

---

## API reference

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/practice-sessions` | Upload a recording (`multipart/form-data`: `video`, `topic`, `durationSeconds`) |
| `GET` | `/api/practice-sessions` | List all recordings, newest first |
| `GET` | `/api/practice-sessions/{id}` | Get one recording's metadata |
| `GET` | `/api/practice-sessions/{id}/video` | Stream the video (supports HTTP Range requests for seeking) |
| `PUT` | `/api/practice-sessions/{id}/review` | Set self-review fields (`wentWell`, `needsImprovement`, `fillerWordCount`, `notes`) |
| `DELETE` | `/api/practice-sessions/{id}` | Delete a recording (file + metadata) |

Interview endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/interview-questions` | List active interview questions; optional `role`, `level`, `category` filters |
| `GET` | `/api/interview-questions/{id}` | Get one interview question |
| `POST` | `/api/interview-sessions` | Create an interview attempt before recording upload |
| `POST` | `/api/interview-sessions/{id}/recording` | Upload the confirmed recording (`multipart/form-data`: `video`, `durationSeconds`) |
| `GET` | `/api/interview-sessions` | List interview attempts; optional role/level/category/question filters |
| `GET` | `/api/interview-sessions/{id}` | Get one interview attempt, question context, statuses, and deterministic metrics |
| `GET` | `/api/interview-sessions/{id}/video` | Stream the interview recording |
| `PUT` | `/api/interview-sessions/{id}/review` | Save self-review fields |
| `DELETE` | `/api/interview-sessions/{id}` | Delete interview metadata and media |

## Testing

```bash
# Backend - needs a local Postgres and a `speakbetter_test` database
cd backend
createdb speakbetter_test   # first time only
./gradlew test

# Frontend
cd frontend
npm test              # Vitest
npm run build          # type-check + lint-clean + production build
npx oxlint              # lint only
```

If your local Postgres requires password authentication, export matching credentials before running backend tests, for example:

```bash
export SPRING_DATASOURCE_USERNAME=your_user
export SPRING_DATASOURCE_PASSWORD=your_password
./gradlew test
```

The Docker workflow configures Postgres credentials automatically.

---

## Deploying it live (optional)

This is entirely optional — everything above runs fully offline/locally. If you want a live version (e.g. at a custom domain), the codebase is already prepared for it:

1. **Cloudflare R2** (free, 10GB) — create a bucket + API token, gives you `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Needed because most free-tier hosts don't offer a persistent disk.
2. **Railway** (or similar) — deploy `backend/`, add a Postgres plugin, set `SPRING_PROFILES_ACTIVE=r2` plus the R2 and datasource env vars from [Configuration](#configuration).
3. **GitHub Pages** — the workflow at `.github/workflows/deploy-frontend.yml` builds and deploys `frontend/` automatically on push to `main`. Set the `VITE_API_BASE_URL` repository variable to your Railway URL first.
4. **DNS** — add a CNAME for your custom domain pointing at `<your-github-username>.github.io`, then set it as the custom domain under repo Settings → Pages.

## Architecture notes

- **`RecordingStorage`** is an interface with two implementations selected by Spring profile: `LocalFilesystemRecordingStorage` (default) and `CloudflareR2RecordingStorage` (under the `r2` profile). Local dev never touches R2-related code at all.
- **Video serving** differs by backend: local storage streams bytes directly with Range support; R2 redirects the browser to a short-lived presigned URL, since R2 serves Range requests itself.
- **No AI is required anywhere in this app.** The practice Transcript and Better Way tabs show honest "not available yet" states. Interview review exposes disabled provider statuses until real server-side providers are configured.
- **Interview preparation groundwork is separate from speaking practice.** `InterviewSession` uses its own table and enums, while still storing recording keys compatible with `RecordingStorage`. Transcript and analysis fields have explicit statuses, so the app can say "not configured" or "pending" without inventing feedback.
- **Interview metrics are deterministic.** Duration target bands use recorded duration only. Word count, words per minute, filler words, and STAR indicators require a real transcript; when no transcript exists, the API returns transcript-required states instead of zeros or guesses.
- **Optional providers are disabled by default.** `AI_TRANSCRIPTION_ENABLED` and `AI_ANALYSIS_ENABLED` default to `false`; the disabled providers return explicit unavailable results and never fake transcript or AI feedback. Do not commit provider API keys.
- **Retention is enforced by one SQL query**: the cleanup job only ever selects sessions where `expires_at < now()`, so it's structurally impossible for it to delete something early.
