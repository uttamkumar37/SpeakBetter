# Delivery roadmap

The user requested one Go backend at `backend/` and removal of the original implementation from the active branch after verifying `backup-V0`. React stays at `frontend/`; root Compose now selects Go. Continue in small verified slices, explaining each Go package and behavior before adding dependent functionality.

| Stage | Deliverable | Status |
|---|---|---|
| 0 | Backup SHA/branch/tag, external source/media backups and source restoration | Verified; no existing application data |
| 1 | Source audit, API/feature inventory, migration design | Completed; original audit archived externally, current audit updated |
| 2 | Go/Gin bootstrap, health, safe errors/config/logs/shutdown | Implemented and tested |
| 3 | pgx, explicit versioned migrations, schema readiness, isolated integration tests | Fresh database verified; existing-data import pending |
| 4 | Local/R2 storage, signature/size validation, safe paths and Range streaming | Local and simulated R2 verified; live R2 pending |
| 5 | Practice API, review, history, delete/retention | Verified, including deletion retry and failed-insert compensation |
| 6 | Eight-question interview catalog, filters, sessions, review, deterministic metrics | Implemented and tested, including simultaneous uploads |
| 7 | Frontend default Go integration and full feature parity | Frontend checks and built frontend/API proxy smoke pass; real-browser/device validation pending |
| 8 | Go/default Compose, non-root images, persistent volumes, Docker/Podman workflow | Renamed-layout Podman build/up/health/upload/playback/delete smoke verified; Docker Desktop not available in this environment |
| 9 | Real configurable transcription, consent, durable jobs/retries, editable versions | Pending |
| 10 | Validated structured grammar/sentence feedback from actual input | Pending |
| 11 | Corrections, exercises, linked retries and comparable before/after feedback | Pending |
| 12 | Mistake recurrence/mastery evidence, daily plans, tutor/TTS abstractions | Pending |
| 13 | Evidence-supported metric versioning, provider/prompt cohorts, 7/30/90-day trends | Pending |
| 14 | Kustomize, managed PostgreSQL/private object storage, restricted OpenShift runtime and real staging smoke | Pending |
| 15 | Public authentication/authorization, privacy/retention separation, Prometheus, image scans, promotion and rollback validation | Pending; formatting/vet/race/frontend/dependency CI added |

## Engineering boundaries

Use a Go modular monolith, explicit constructors and small consumer-defined interfaces. Keep typed query/scan functions grouped by feature. Add sqlc only if repeated mapping justifies another generator. Versioned SQL is embedded; migrations are an explicit command and must refuse unmanaged existing databases. Never edit schema-changing statements in applied migrations.

Compatibility routes retain JSON arrays, relative media URLs, nullable fields and multipart names. Introduce `/api/v2` learning endpoints only alongside working persisted behavior and frontend consumers. Do not silently paginate legacy arrays or remove review/playback paths.

For an installation with actual data, freeze writes/cleanup, verify external database/media backups, restore into a new database, preserve UUIDs/keys/question snapshots/reviews/expiry, decide timestamp timezone and validate every media reference. Cut over only after parity passes; retain original data for rollback. Do not use original volumes for testing. A backup source branch is not a database backup.

## Learning cycle

Practice → actual transcript or user text → validated analysis → explain/correct → linked retry → comparable result → persistent mistake evidence → next exercise. Store source versions, provider/model, methodology, uncertainty and timestamps. Up to three priorities must reference actual issues; grammatical errors and optional style suggestions are distinct. Provider failure never removes a recording or substitutes invented text. Processing requires explicit user consent and provider disclosure. Manual practice must work without paid subscriptions.

Text does not support pronunciation scores. Accent variation is not an error. Duration and self-review completion do not measure language ability. Missing evidence stays unavailable; compare matching activities/prompts and compatible analysis versions. Preserve intended meaning and do not present estimates as proficiency certification.

Public deployment requires real single-user or multi-user access control, protected media, HTTPS, durable private storage, managed PostgreSQL, restricted non-root containers, secrets, health probes, resource limits and verified migration/rollback procedures. The present local parity milestone does not complete the V2 release definition.
