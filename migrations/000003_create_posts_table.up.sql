CREATE TABLE IF NOT EXISTS posts (
    post_pid bigint PRIMARY KEY DEFAULT next_id(),
    user_id bigint REFERENCES users ON DELETE SET NULL,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    title text NOT NULL,
    content text NOT NULL,
    has_files bool NOT NULL,
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    version int NOT NULL DEFAULT 1,
    CONSTRAINT posts_title_check CHECK (LENGTH(title) <= 50),
    CONSTRAINT posts_content_check CHECK (LENGTH(content) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_posts_desc ON posts (post_pid DESC);
