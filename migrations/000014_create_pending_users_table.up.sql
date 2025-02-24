CREATE TABLE IF NOT EXISTS pending_users (
    user_pid bigint PRIMARY KEY DEFAULT next_id(),
    username citext UNIQUE CHECK (length(username) BETWEEN 3 AND 30 AND username ~ '^[A-Za-z0-9_]+$'),
    name text CHECK (LENGTH(TRIM(name)) <= 50),
    email citext UNIQUE NOT NULL,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    expiry timestamp(0) with time zone NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    version int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_pending_reg_email ON pending_users(email);
CREATE INDEX IF NOT EXISTS idx_pending_reg_expiry ON pending_users(expiry);

CREATE OR REPLACE FUNCTION cleanup_pending_registrations()
RETURNS void AS $$
BEGIN
    DELETE FROM pending_users WHERE expiry < NOW();
END;
$$ LANGUAGE plpgsql;
