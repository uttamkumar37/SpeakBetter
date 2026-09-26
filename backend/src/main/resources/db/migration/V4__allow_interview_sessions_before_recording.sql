ALTER TABLE interview_sessions
    ALTER COLUMN file_path DROP NOT NULL,
    ALTER COLUMN original_mime_type DROP NOT NULL,
    ALTER COLUMN file_size_bytes DROP NOT NULL,
    ALTER COLUMN duration_seconds DROP NOT NULL;
