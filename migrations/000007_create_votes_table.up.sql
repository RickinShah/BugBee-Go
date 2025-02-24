CREATE TABLE IF NOT EXISTS post_votes (
    user_id bigint REFERENCES users ON DELETE SET NULL,
    post_id bigint REFERENCES posts ON DELETE CASCADE,
    vote_type smallint NOT NULL CHECK (vote_type IN (-1, 0, 1)),
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comment_votes (
    user_id bigint REFERENCES users ON DELETE SET NULL,
    comment_id bigint REFERENCES comments ON DELETE SET NULL,
    vote_type smallint NOT NULL CHECK (vote_type IN (-1, 0, 1)),
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_post_votes ON post_votes (user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes ON comment_votes (user_id, comment_id);
