CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    user_pid bigint PRIMARY KEY DEFAULT next_id (),
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW (),
    name text NOT NULL CHECK (LENGTH(name) <= 50),
    username citext UNIQUE NOT NULL CHECK (length(username) <= 30),
    email citext UNIQUE NOT NULL,
    password_hash bytea NOT NULL,
    activated bool NOT NULL,
    bio text CHECK (LENGTH (bio) <= 150),
    show_nsfw bool NOT NULL DEFAULT false,
    version int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
