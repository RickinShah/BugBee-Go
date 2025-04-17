CREATE TABLE IF NOT EXISTS posts (
    post_pid bigint PRIMARY KEY DEFAULT next_id(),
    user_id bigint REFERENCES users ON DELETE CASCADE,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    content text,
    has_files bool NOT NULL,
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    deleted_at timestamp(0) with time zone DEFAULT NULL,
    version int NOT NULL DEFAULT 1,
    CONSTRAINT posts_content_check CHECK (LENGTH(content) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_posts_desc ON posts (post_pid DESC);
