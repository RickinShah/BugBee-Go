CREATE TABLE IF NOT EXISTS vote_counts (
    target_id bigint NOT NULL,
    target_type char(1) NOT NULL CHECK (target_type IN ('P','C','R')),
    upvote_count int NOT NULL DEFAULT 0,
    downvote_count int NOT NULL DEFAULT 0,
    score numeric GENERATED ALWAYS AS (
        CASE
            WHEN (upvote_count + downvote_count) = 0 THEN 0
            ELSE upvote_count::numeric/NULLIF((upvote_count + downvote_count), 0) * 100
        END
    ) STORED,
    last_updated timestamp(0) with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY(target_id, target_type)
);

CREATE INDEX IF NOT EXISTS idx_vote_counts_score ON vote_counts (score DESC);
CREATE INDEX IF NOT EXISTS idx_vote_counts_target ON vote_counts (target_id, target_type);