CREATE TABLE IF NOT EXISTS posts (
    post_pid bigint PRIMARY KEY DEFAULT next_id(),
    user_id bigint,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    title text NOT NULL,
    content text NOT NULL,
    upvotes int NOT NULL DEFAULT 0,
    downvotes int NOT NULL DEFAULT 0,
    post_type text NOT NULL,
    comments int NOT NULL DEFAULT 0,
    version int NOT NULL DEFAULT 1,
    CONSTRAINT posts_title_check CHECK (LENGTH(title) <= 50),
    CONSTRAINT posts_content_check CHECK (LENGTH(content) <= 500),
    CONSTRAINT fk_posts_users
        FOREIGN KEY (user_id)
            REFERENCES users (user_pid)
            ON DELETE SET NULL
);