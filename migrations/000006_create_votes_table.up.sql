CREATE TABLE IF NOT EXISTS votes (
    user_id bigint REFERENCES users ON DELETE SET NULL,
    target_id bigint NOT NULL,
    target_type char(1) NOT NULL CHECK (target_type IN ('P','C','R')),
    vote_type smallint NOT NULL CHECK (vote_type IN (-1, 0, 1)),
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, target_id, target_type)
);

CREATE INDEX IF NOT EXISTS idx_votes_target ON votes (user_id, target_id, target_type);
