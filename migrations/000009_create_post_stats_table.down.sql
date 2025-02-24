DROP TRIGGER IF EXISTS trigger_post_stats ON posts;
DROP TABLE IF EXISTS post_stats;
DROP FUNCTION IF EXISTS update_post_stats();