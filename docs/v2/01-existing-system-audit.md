# Implementation and feature-parity audit

The active application is Go-only at `backend/`, with React in `frontend/`. The original source-based audit was completed before changes and archived outside the checkout with the verified backup. Original implementation details remain available on [`backup-V0`](https://github.com/uttamkumar37/SpeakBetter/tree/backup-V0), commit `e31fb0e926acb9a443be852960bff928e83da10a`. This document tracks the current implementation without presenting removed source as active code.

## Feature contracts and evidence

| Feature | Current source and contract | Status and remaining risk |
|---|---|---|
| Recording, device selection, countdown, preview/retake | `frontend/src/components/VideoRecorder.tsx`, `RecordingPreview.tsx`, `pages/PracticePage.tsx` | Existing UI preserved; mocked practice/permission tests pass; real-device browser smoke remains required |
| Topics, speaking guides, stand-up | `frontend/src/utils/topicGuides.ts`, `TopicSelector`, `SpeakingGuide` | Preserved, including custom topics |
| Practice upload/history/detail | `backend/internal/practice`; POST/GET `/api/practice-sessions`, GET UUID | Go PostgreSQL/HTTP tests pass; JSON array ordering, nullable review values, generated media paths and 30-day expiry preserved |
| Review workspace/playback | `components/review`; GET/HEAD session `/video` via `internal/recording` | Local 200/206/suffix/416 seeking tested; missing/size-mismatched media produces safe errors |
| Audio-only and video-only review | `AudioOnlyTab.tsx`, `VideoOnlyTab.tsx` | Play original media with audio controls or mute. These are not transcoding or separate capture modes |
| Self-review/filler notes | `practice.Review`, PUT session `/review`, `SessionReview.tsx` | Optional nullable fields, trim/clear behavior, nonnegative integer count and 2000-character limits tested |
| Attempt comparison/retry | `groupByTopic.ts`, `CompareTab.tsx`, record-again action | Existing topic-based grouping preserved. Immutable prompt/parent linkage and evidence-based language comparison still pending |
| Progress | `ProgressPage.tsx`, `sessionInsights.ts` | Counts/time/grouping preserved. Duration-heavy heuristic remains and must not be treated as English proficiency; V2 replacement pending |
| Interview catalog/filtering | `internal/interview/questions.json`, `catalog.go`; GET question list/detail | All eight original reviewed questions retained; GENERAL role inclusion, enums, matching and sorted output tested |
| Interview preparation/create | POST `/api/interview-sessions`, `interview.Service.Create` | Context validation and saved question snapshot preserved; null media before upload tested |
| Interview upload/state transition | POST session `/recording` | Atomic CREATED → READY transition; simultaneous uploads save exactly one recording; rejected upload compensated |
| Interview history/review/delete | `interview/service.go`, `handlers.go`, existing React pages | Filters, empty arrays, question snapshot fallback, self-review, future/expired cleanup tested |
| Interview metrics | `interview/metrics.go` | Duration target bands, exact-word filler matching, WPM and STAR keyword indicators ported; null/unavailable without actual transcript; no quality score invented |
| Local storage | `platform/storage/local.go`, `recording/http.go` | Rooted filesystem, exclusive generated names, interrupted-write cleanup, cancellation, path/symlink escapes and Range tests pass |
| Private R2 storage | `platform/storage/r2.go` | Real S3 signing, HEAD, upload/delete and 15-minute presigned redirect adapter tested against HTTPS test server; live credentialed R2 test pending |
| Deletion and retention | Both feature services and `cmd/api` cleanup loop | Delete intent uses retryable tombstones; future recordings are untouched; default 30 days. Current retention removes media and rows; learning-history retention separation remains pending |
| Errors and HTTP safeguards | `httpapi`, `config`, `cmd/api` | Consistent safe message/request ID, exact CORS origins, limits/timeouts, parameterized queries, graceful shutdown and private-log tests |
| Containers and CI | Root Compose, backend/frontend Dockerfiles, `.github/workflows` | Go default stack; API/frontend non-root; separate V2 volumes; final renamed-layout smoke and CI execution status in delivery log |

Practice DTO: id, topic, createdAt, durationSeconds, expiresAt, relative videoUrl, nullable wentWell/needsImprovement/fillerWordCount/notes. Interview DTO adds role/level/category, nested question, status, transcript/analysis availability, nullable media metadata, updatedAt, and deterministic metrics. Review PUT replaces all fields. Collections remain arrays. UUID errors return 400 and missing sessions 404. Uploads retain the `video` multipart field for compatibility; signatures support WebM, MP4, Ogg and WAV containers.

## Data and security boundaries

PostgreSQL schema version 1 contains `practice_sessions` and `interview_sessions`, original UUID/media/review/question/timestamp fields and indexes. SQL is embedded and explicitly applied with golang-migrate. Unknown existing nonempty databases are refused; existing-data import is not automatic. New timestamps are UTC; an existing database with timezone-free timestamps requires an explicit original-timezone decision before import. Current metadata/media retention is coupled.

There is no authentication, tenant/user model, authorization or public private-media boundary yet. CORS is not access control. Local host bindings are loopback-only. Secrets come from the environment, and logs omit user text, query strings and signed URLs. Public deployment remains blocked on authentication/authorization and HTTPS work.

## Functionality not yet implemented

Real transcription, transcript editing/versions/timestamps, AI grammar and sentence alternatives, conversational tutoring, TTS, text-only practice, retry-linked feedback, mistake/exercise history, personalized daily plans, 7/30/90-day comparable language metrics, independent learning retention, settings/privacy controls and Kubernetes/OpenShift release validation remain roadmap work. Existing transcript/analysis UI states remain honestly unavailable. No placeholder learning tables, fake provider outputs or fabricated scores were added.

## Verification

Go tests cover configuration, routing/CORS/privacy, PostgreSQL migrations/readiness, storage adapters, uploads/streaming/deletion/retention, interview filtering/state transitions and evidence availability. Integration tests create private disposable databases and must actually run with `TEST_DATABASE_URL`. Frontend has five Vitest files with 28 tests covering practice flow, permission failure, API normalization/errors, formatting, grouping and media utilities. Interview UI, accessibility and real-device recording need broader validation. Actual results and external limitations are in [the delivery log](04-delivery-log.md).
