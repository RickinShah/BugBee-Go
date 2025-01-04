CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
    user_pid bigint PRIMARY KEY DEFAULT next_id (),
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW (),
    name text NOT NULL,
    username citext UNIQUE NOT NULL,
    email citext UNIQUE NOT NULL,
    password_hash bytea NOT NULL,
    activated bool NOT NULL,
    bio text CONSTRAINT users_bio_check CHECK (LENGTH (bio) <= 150),
    show_nsfw bool NOT NULL DEFAULT false,
    version int NOT NULL DEFAULT 1,
    CONSTRAINT users_name_check CHECK (LENGTH(name) <= 50),
    CONSTRAINT users_username_check CHECK (LENGTH (username) <= 30)
);

CREATE INDEX IF NOT EXISTS idx_username_users ON users (username);
CREATE INDEX IF NOT EXISTS idx_email_users ON users (email);
