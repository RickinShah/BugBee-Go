CREATE TABLE IF NOT EXISTS comment_stats (
    comment_pid bigint PRIMARY KEY REFERENCES comments ON DELETE CASCADE,
    reply_count int NOT NULL DEFAULT 0,
    upvote_count int NOT NULL DEFAULT 0,
    score numeric GENERATED ALWAYS AS (
        CASE
            WHEN (upvote_count + downvote_count) = 0 THEN 0
            ELSE upvote_count::numeric/NULLIF((upvote_count + downvote_count), 0) * 100
            END
        ) STORED,
    downvote_count int NOT NULL DEFAULT 0,
    last_reply_at timestamp(0) with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_stats_comment_pid ON comment_stats(comment_pid);

-- CREATE OR REPLACE FUNCTION update_comment_stats() RETURNS TRIGGER AS $$
-- BEGIN
--     IF TG_OP = 'INSERT' THEN
--         -- Create comment stats record
--         INSERT INTO comment_stats (comment_pid) VALUES (NEW.comment_pid);
--
--         -- Update post's comment count and last activity
--         UPDATE post_stats
--         SET comment_count = comment_count + 1,
--             last_comment_at = NEW.created_at,
--             last_activity_at = NEW.created_at
--         WHERE post_id = NEW.post_id;
--
--         -- Update parent comment's reply count if exists
--         IF NEW.parent_comment_id IS NOT NULL THEN
--             UPDATE comment_stats
--             SET reply_count = reply_count + 1,
--                 last_reply_at = NEW.created_at
--             WHERE comment_pid = NEW.parent_comment_id;
--         END IF;
--
--         -- Update user's comment count
--         UPDATE user_stats
--         SET total_comments = total_comments + 1
--         WHERE user_pid = NEW.user_id;
--     END IF;
--     RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trigger_comment_stats AFTER INSERT ON comments
--     FOR EACH ROW EXECUTE FUNCTION update_comment_stats();
