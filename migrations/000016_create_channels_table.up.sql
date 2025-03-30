CREATE TABLE IF NOT EXISTS channels (
    channel_pid bigint PRIMARY KEY DEFAULT next_id(),
    community_id bigint REFERENCES communities ON DELETE CASCADE,
    name citext NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_roles (
    channel_id bigint REFERENCES channels ON DELETE CASCADE,
    role_id bigint REFERENCES community_roles,
    PRIMARY KEY(channel_id, role_id)
);

CREATE TABLE IF NOT EXISTS channel_posts (
    post_pid bigint PRIMARY KEY DEFAULT next_id(),
    user_id bigint REFERENCES users ON DELETE SET NULL,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    content text,
    has_files bool NOT NULL,
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    version int NOT NULL DEFAULT 1,
    CONSTRAINT posts_content_check CHECK (LENGTH(content) <= 1000)
);

CREATE INDEX IF NOT EXISTS idx_channel_posts_desc ON channel_posts (post_pid DESC);
