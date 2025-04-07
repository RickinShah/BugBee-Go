CREATE TABLE IF NOT EXISTS user_stats (
    user_pid bigint PRIMARY KEY REFERENCES users ON DELETE CASCADE,
    community_count int NOT NULL DEFAULT 0,
    post_upvoted int NOT NULL DEFAULT 0,
    commented_count int NOT NULL DEFAULT 0,
    post_downvoted int NOT NULL DEFAULT 0,
    post_count int NOT NULL DEFAULT 0,
    last_post_at timestamp(0) with time zone
);
