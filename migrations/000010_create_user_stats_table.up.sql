CREATE TABLE IF NOT EXISTS user_stats (
    user_pid bigint PRIMARY KEY REFERENCES users ON DELETE CASCADE,
    follower_count int NOT NULL DEFAULT 0,
    following_count int NOT NULL DEFAULT 0,
    total_upvotes int NOT NULL DEFAULT 0,
    total_comments int NOT NULL DEFAULT 0,
    total_downvotes int NOT NULL DEFAULT 0,
    post_count int NOT NULL DEFAULT 0,
    last_post_at timestamp(0) with time zone,
    last_login_at timestamp(0) with time zone DEFAULT now()
);
