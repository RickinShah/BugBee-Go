CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    user_pid bigint PRIMARY KEY DEFAULT next_id(),
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    name text CHECK (LENGTH(TRIM(name)) <= 50),
    username citext UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 30 AND username ~ '^[A-Za-z0-9_]+$'),
    email citext UNIQUE NOT NULL CHECK (email ~ E'^[a-zA-Z0-9.!#$%\'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'),
    password_hash bytea NOT NULL,
    activated bool NOT NULL DEFAULT false,
    bio text CHECK (LENGTH(TRIM(bio)) <= 150),
    profile_pic bool NOT NULL DEFAULT false,
    show_nsfw bool NOT NULL DEFAULT false,
    updated_at timestamp(0) with time zone NOT NULL DEFAULT now(),
    version int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
