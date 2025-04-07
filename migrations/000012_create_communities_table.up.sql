CREATE TABLE IF NOT EXISTS communities (
    community_pid bigint PRIMARY KEY DEFAULT next_id(),
    creator_id bigint REFERENCES users ON DELETE SET NULL,
    handle citext UNIQUE NOT NULL CHECK (length(handle) BETWEEN 3 AND 30 AND handle ~ '^[A-Za-z0-9_]+$'),
    name citext NOT NULL CHECK (LENGTH(TRIM(name)) <= 50),
    description text CHECK (LENGTH(TRIM(description)) <= 300),
    is_official boolean NOT NULL DEFAULT FALSE,
    profile_path text,
    created_at timestamp(0) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT now(),
    version int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS gin_idx_communities_handle ON communities USING gin (handle gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_idx_communities_name ON communities USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS community_members (
    user_id bigint REFERENCES users ON DELETE CASCADE,
    community_id bigint REFERENCES communities ON DELETE CASCADE,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members ON community_members(community_id);
