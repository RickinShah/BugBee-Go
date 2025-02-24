CREATE TABLE IF NOT EXISTS files (
    file_pid bigint PRIMARY KEY,
    post_id bigint REFERENCES posts ON DELETE CASCADE,
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    size bigint NOT NULL CHECK (size <= 104857600),
    is_nsfw bool NOT NULL DEFAULT false,
    created_at timestamp(0) with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_post_id ON files (post_id);