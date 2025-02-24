CREATE TABLE IF NOT EXISTS post_stats (
    post_id bigint PRIMARY KEY REFERENCES posts(post_pid) ON DELETE CASCADE,
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

-- CREATE OR REPLACE FUNCTION update_post_stats() RETURNS TRIGGER AS $$
-- BEGIN
--     IF TG_OP = 'INSERT' THEN
--         INSERT INTO post_stats (post_id) VALUES (NEW.post_pid)
--         ON CONFLICT (post_id) DO NOTHING;
--
--         UPDATE user_stats
--         SET post_count = post_count + 1,
--             last_post_at = NEW.created_at
--         WHERE user_pid = NEW.user_id;
--     END IF;
--     RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trigger_post_stats AFTER INSERT ON posts
--     FOR EACH ROW EXECUTE FUNCTION update_post_stats();
