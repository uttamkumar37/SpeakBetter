ALTER TABLE practice_sessions
    ADD COLUMN went_well          VARCHAR(2000),
    ADD COLUMN needs_improvement  VARCHAR(2000),
    ADD COLUMN filler_word_count  INTEGER,
    ADD COLUMN notes              VARCHAR(2000);
