CREATE TABLE IF NOT EXISTS post_stats (
    post_pid bigint PRIMARY KEY REFERENCES posts(post_pid) ON DELETE CASCADE,
    upvote_count int NOT NULL DEFAULT 0,
    downvote_count int NOT NULL DEFAULT 0,
    comment_count int NOT NULL DEFAULT 0,
    score numeric GENERATED ALWAYS AS (
        CASE
            WHEN (upvote_count + downvote_count) = 0 THEN 0
            ELSE upvote_count::numeric/NULLIF((upvote_count + downvote_count), 0) * 100
            END
        ) STORED,
    last_activity_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    last_comment_at timestamp(0) with time zone
);
