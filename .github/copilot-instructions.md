# Repository Copilot Instructions

## Repository Overview

**SpeakBetter** is a personal communication-practice app, not just a recorder. The core loop to preserve:

Practice -> Record -> Review -> Analyze -> Understand -> Learn -> Record Again -> Compare -> Track Progress.

Users record themselves (webcam + microphone) on a topic, review the attempt, add a manual self-review and track improvement. An **Interview Preparation Portal** follows the same standard: select role/level/category -> select a real question -> read guidance -> record -> preview -> save -> review -> retry -> compare. Nothing requires an AI provider to work; transcription/analysis are optional, disabled by default extension points.

## Technology Stack

- Backend: Java 21, Spring Boot 3.3.4, Gradle (wrapper), Spring Data JPA, Flyway, Spring Scheduler, Bean Validation
- Database: PostgreSQL (16 in `docker-compose.yml`)
- Storage: local filesystem by default; Cloudflare R2 via the AWS SDK v2 S3 client under the `r2` Spring profile
- Frontend: React 19, TypeScript, Vite, React Router 7, plain CSS (no UI framework), Vitest + React Testing Library, oxlint
- Containers: Dockerfiles for backend and frontend, `docker-compose.yml` (Docker or Podman)
- CI/CD: GitHub Actions `deploy-frontend.yml` (GitHub Pages); backend build config for Railway in `backend/nixpacks.toml`

Deliberately not used: Redux, Kafka, Redis, Kubernetes, microservices. Do not introduce them.

## Repository Structure

```
backend/src/main/java/com/speakbetter/practice/
  controller/   REST endpoints (thin, no business logic)
  service/      business logic, question catalog, deterministic interview metrics
    storage/    RecordingStorage interface + LocalFilesystem / CloudflareR2 implementations
    analysis/   TranscriptionService / CommunicationAnalysisService (interfaces + disabled providers)
  repository/   Spring Data JPA repositories
  entity/  dto/  config/  scheduler/  exception/
backend/src/main/resources/   application.yml, application-r2.yml, db/migration/V1..V4
backend/src/test/             unit + integration tests
frontend/src/                 pages/, components/ (components/review/), state/ (React Context), api/, utils/
docker-compose.yml            Postgres + backend + frontend
.github/workflows/            deploy-frontend.yml
CLAUDE.md                     existing assistant notes for this repo (do not overwrite)
```

## Architecture

Layered Spring Boot REST API (controller -> service -> repository) plus a React SPA. Notable design points:

- `RecordingStorage` is an interface with two profile-selected implementations; local dev never touches R2 code. Video streaming supports HTTP Range locally; R2 redirects to a short-lived presigned URL.
- `InterviewSession` has its own table and enums, separate from practice sessions, but stores recording keys compatible with `RecordingStorage`.
- Retention is one query: the cleanup job selects only sessions with `expires_at < now()`, so nothing is deleted early (default 30 days, cron `0 0 3 * * *`).

## Development Commands

```bash
# Backend (needs local Postgres; createdb speakbetter)
cd backend && ./gradlew bootRun          # http://localhost:8080, Flyway migrates on startup
cd backend && ./gradlew test             # needs a `speakbetter_test` database (createdb speakbetter_test)

# Frontend
cd frontend && npm install
cd frontend && npm run dev               # http://localhost:5173
cd frontend && npm test                  # Vitest (vitest run)
cd frontend && npm run build             # tsc -b && vite build
cd frontend && npm run lint              # oxlint

# Everything via containers
docker compose up --build -d             # or: podman compose up --build -d
docker compose down                      # keeps recordings volume; `down -v` deletes data
```

If local Postgres needs credentials, export `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` before backend tests.

## Coding Guidelines

Backend (Java/Spring):
- Constructor injection; keep controllers thin; business logic in services.
- Use DTOs for API contracts; validate input with Bean Validation; keep the global exception handler as the single error path.
- Every schema change is a new Flyway migration (`V5__...`); never edit an applied migration.
- Config comes from `@ConfigurationProperties` (`app.recordings.*`) and environment variables, not constants.
- Keep backend storage and API contracts stable unless a feature requires backend work.

Frontend (React/TypeScript):
- Follow existing patterns: pages in `pages/`, shared state via React Context in `state/`, API calls only through `api/`.
- Type everything; avoid `any`. Keep components focused.
- Keep the existing indigo/violet visual identity, restrained accents and responsive layouts. Do not add visible controls that do nothing.
- All buttons, links, tabs, form fields and recording controls must be keyboard-accessible; respect `prefers-reduced-motion`.

## Testing

- Backend: JUnit 5 + Spring Boot Test under `backend/src/test` (controller integration tests, service tests, storage and interview analysis tests). Integration tests need PostgreSQL.
- Frontend: Vitest + React Testing Library (`App.test.tsx`, `api/practiceSessionsApi.test.ts`, `utils/*.test.ts`).
- Add tests for new behavior. Run focused backend tests for interview domain/API/metric changes and the full suite when local Postgres test credentials are available. Run frontend tests, build and lint before finishing UI changes.

## API / Data Rules

- Practice endpoints: `/api/practice-sessions` (POST multipart upload, GET list/one, `/video`, PUT `/review`, DELETE). Interview endpoints: `/api/interview-questions`, `/api/interview-sessions` (create, `/recording`, `/video`, `/review`, DELETE).
- Deleting a session removes its media and metadata through the same storage abstraction used for practice recordings.
- Upload limits and allowed MIME types are configured under `app.recordings`.

## Security

- No authentication layer exists in this codebase; do not claim one. CORS origins come from `CORS_ALLOWED_ORIGINS`.
- R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) and AI provider keys come from environment variables only; never commit them.
- Recordings are personal media: keep retention/deletion behavior intact and never log recording content.

## Infrastructure / Deployment

Docker Compose for local full stack; Railway for the backend and Cloudflare R2 for storage (documented in README, `nixpacks.toml`); GitHub Pages for the frontend via `deploy-frontend.yml` (`npm ci`, `npm run build`, custom domain CNAME).

## Change Guidelines

1. Understand the existing implementation first.
2. Make the smallest coherent change.
3. Preserve current architecture unless there is a strong reason to change it.
4. Do not introduce a new library when the existing stack already solves the requirement.
5. Update tests for behavior changes.
6. Run relevant tests/build before considering the change complete.
7. Do not leave commented-out code.
8. Do not leave TODO placeholders unless explicitly requested.
9. Do not fabricate implementation status.
10. Do not claim something was tested unless it was actually executed.

## Code Quality Rules

- Prefer readable code over clever code; avoid unnecessary duplication and abstraction.
- Follow existing naming conventions; keep methods and components focused.
- Handle edge cases (permission denied, unsupported browser, oversized upload, missing/corrupted file, backend unreachable) with clean user messages, never raw stack traces.
- Preserve backward compatibility of stored data and API contracts.
- Avoid unrelated refactoring during focused changes.

## Git Commit Rules

- Never add a `Co-Authored-By` trailer unless I explicitly request it.
- Never add Claude, Anthropic, GitHub Copilot, OpenAI, ChatGPT, Codex, Cursor, or any AI tool as an author or co-author.
- Use only the configured Git `user.name` and `user.email`.
- Do not mention AI assistance in commit messages.
- Keep commit messages concise and professional.
- Do not commit automatically unless I explicitly ask.
- Do not push automatically unless I explicitly ask.
- Never force-push unless I explicitly request it.
- Never rewrite Git history unless I explicitly request it.

## Git Commit Attribution Rules

- Never add a `Co-Authored-By` trailer for an AI system.
- Never add Claude, Anthropic, GitHub Copilot, OpenAI, ChatGPT, Codex, Cursor, Gemini, Devin, or any AI tool as an author or co-author.
- Never change Git author/committer identity to an AI account.
- Use only the configured human Git `user.name` and `user.email`.
- Do not add “Generated by AI”, “Created with AI”, or similar attribution to commit messages.
- Keep commit messages focused on the technical change.
- Do not commit automatically unless explicitly requested.
- Do not push automatically unless explicitly requested.
- Never rewrite Git history unless explicitly requested.

## AI Assistant Working Rules

When working in this repository:

- Inspect existing code before proposing architecture changes.
- Do not assume a feature exists without verifying it.
- Do not create fake implementations to make UI or tests appear complete.
- Do not generate random metrics, scores, or placeholder business data unless explicitly requested as test/demo data.
- Clearly separate verified behavior from assumptions.
- Prefer completing working vertical slices over creating many unfinished placeholders.
- Preserve repository conventions.
- Avoid massive rewrites unless explicitly requested.
- When fixing a bug, identify the underlying cause where practical.
- When adding functionality, consider error handling and tests.
- Never expose secrets, API keys, tokens, or credentials.
- Never hardcode secrets.

## Repository-Specific Rules (product integrity and privacy)

- **Never fake analysis, scores, percentages, eye contact, posture, confidence, transcript or speech metrics.** Show a metric only when it comes from real stored data, deterministic calculation, documented heuristic logic, real transcript analysis or real AI analysis.
- If a metric cannot be measured reliably, show an honest state such as "Not enough data", "Analysis unavailable" or "Transcript required for this metric".
- Separate deterministic metrics (e.g. duration bands, attempt counts, time practiced) from transcript-dependent metrics (word count, words per minute, filler words, STAR structure) and from AI-derived feedback, in both API and UI. Interview duration bands are guidance, not quality scores.
- Optional transcription/analysis providers stay disabled by default (`AI_TRANSCRIPTION_ENABLED`, `AI_ANALYSIS_ENABLED` = `false`) and must never return fake fallback text or feedback.
- **Preserve recording data if AI analysis fails.** A failed or unavailable analysis must never delete, block or corrupt a saved recording.
- **Communication analysis must not judge physical appearance.** Feedback concerns delivery, structure and content only.
- Transcript, audio markers, video engagement, posture and eye-contact features are presented as unavailable unless a real implementation exists.
- Coaching language is supportive, professional and specific ("Try...", "Consider...", "Focus next..."); prefer one clear next-practice goal over many suggestions.
- Dashboard personalization uses actual session history only. Review screens explain any heuristic score methodology.
- Recording UI: clear, actionable camera/mic permission errors, and always clean up media streams and recorder resources on stop or unmount.
