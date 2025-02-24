CREATE TABLE IF NOT EXISTS comments (
    comment_pid bigint PRIMARY KEY DEFAULT next_id(),
    post_id bigint NOT NULL REFERENCES posts ON DELETE CASCADE,
    parent_comment_id bigint REFERENCES comments ON DELETE CASCADE,
    user_id bigint REFERENCES users ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) BETWEEN 1 AND 500),
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    version int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);