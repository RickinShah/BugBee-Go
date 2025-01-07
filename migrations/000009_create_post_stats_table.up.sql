CREATE TABLE post_stats (
    post_id bigint PRIMARY KEY REFERENCES posts(post_pid) ON DELETE CASCADE,
    comment_count int NOT NULL DEFAULT 0,
    last_activity_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    last_comment_at timestamp(0) with time zone
);
