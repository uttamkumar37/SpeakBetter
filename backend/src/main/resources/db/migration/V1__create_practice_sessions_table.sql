CREATE TABLE practice_sessions (
    id                  UUID PRIMARY KEY,
    topic               VARCHAR(255)  NOT NULL,
    file_path           VARCHAR(512)  NOT NULL,
    original_mime_type  VARCHAR(100)  NOT NULL,
    file_size_bytes     BIGINT        NOT NULL,
    duration_seconds    INTEGER       NOT NULL,
    created_at          TIMESTAMP     NOT NULL,
    expires_at          TIMESTAMP     NOT NULL,
    status              VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX idx_practice_sessions_topic ON practice_sessions (topic);
CREATE INDEX idx_practice_sessions_expires_at ON practice_sessions (expires_at);
CREATE INDEX idx_practice_sessions_created_at ON practice_sessions (created_at DESC);
