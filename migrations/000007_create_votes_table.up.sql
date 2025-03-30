CREATE TABLE IF NOT EXISTS post_votes (
    user_id bigint REFERENCES users ON DELETE CASCADE,
    post_id bigint REFERENCES posts ON DELETE CASCADE,
    vote_type smallint NOT NULL CHECK (vote_type IN (-1, 0, 1)),
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comment_votes (
    user_id bigint REFERENCES users ON DELETE CASCADE,
    comment_id bigint REFERENCES comments ON DELETE CASCADE,
    vote_type smallint NOT NULL CHECK (vote_type IN (-1, 0, 1)),
    PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_post_votes ON post_votes (user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes ON comment_votes (user_id, comment_id);
