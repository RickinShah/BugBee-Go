DROP TRIGGER IF EXISTS trigger_assign_community_creator ON communities;
DROP FUNCTION IF EXISTS assign_community_creator();
DROP TABLE IF EXISTS community_members;
DROP TABLE IF EXISTS community_stats;
DROP TYPE community_role;