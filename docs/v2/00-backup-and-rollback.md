# Backup and rollback record

Verified before implementation on 18 October 2026:

- Original commit: `e31fb0e926acb9a443be852960bff928e83da10a`; original `main` matched `origin/main` and had no local changes.
- User-created remote branch **`origin/backup-V0`** was verified at that exact SHA before removing the old backend.
- The annotated `v1-java-backup` tag was also pushed and verified. Do not move or replace it.
- Work remains on `feature/v2-go-migration`; no implementation commit or branch push was made automatically.
- The user confirmed a fresh checkout with no existing application database or recordings.

Per the user's subsequent instruction, the active branch now contains only the Go backend at `backend/`. The duplicate backend directory, old source, build wrapper, configuration and tests were removed. React remains in `frontend/`. Historical source belongs on the verified backup branch.

External backups are at `../SpeakBetter-v1-backups/e31fb0e-2026-10-18/`: a complete verified `source.bundle`, source/media archives, checksums, and the original source-based audit. Every archived media file was read; the checkout contained only `.gitkeep`. A separate clone from the bundle was checked out at the original SHA with a clean tree, verifying source restoration.

Restore source into a separate checkout, keeping current work intact:

```bash
git fetch origin backup-V0
git worktree add --detach ../SpeakBetter-original origin/backup-V0
```

When the remote repository is unavailable, clone the external bundle and select the original SHA. Do not reset the active checkout or overwrite local changes. Git refs are not intrinsically immutable; use a remote ruleset if server-enforced protection is needed.

Source restoration does not restore a database. For installations with real data, first freeze writes/cleanup, create an external custom-format `pg_dump`, export all media with original relative keys, restore into a separate database, and compare row counts/keys and actual object readability. Keep private backups outside recreated directories. Never restore over the original database, reuse its volumes for validation, or run destructive migration commands against it. This fresh checkout needed no existing-data dump.
