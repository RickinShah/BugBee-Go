CREATE TABLE IF NOT EXISTS comment_stats (
    comment_pid bigint PRIMARY KEY REFERENCES comments ON DELETE CASCADE,
    reply_count int NOT NULL DEFAULT 0,
    upvote_count int NOT NULL DEFAULT 0,
    downvote_count int NOT NULL DEFAULT 0,
    score numeric GENERATED ALWAYS AS (
        CASE
            WHEN (upvote_count + downvote_count) = 0 THEN 0
            ELSE upvote_count::numeric/NULLIF((upvote_count + downvote_count), 0) * 100
            END
        ) STORED,
    last_reply_at timestamp(0) with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_stats_comment_pid ON comment_stats(comment_pid);
