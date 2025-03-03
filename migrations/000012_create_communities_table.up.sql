CREATE TABLE IF NOT EXISTS communities (
    community_pid bigint PRIMARY KEY DEFAULT next_id(),
    creator_id bigint REFERENCES users ON DELETE SET NULL,
    is_private boolean NOT NULL DEFAULT FALSE,
    name citext NOT NULL CHECK (LENGTH(TRIM(name)) BETWEEN 1 AND 50),
    description text CHECK (LENGTH(TRIM(description)) <= 300),
    is_nsfw boolean NOT NULL DEFAULT FALSE,
    created_at timestamp(0) with time zone NOT NULL DEFAULT now(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT now(),
    version int NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS community_stats (
    community_pid bigint PRIMARY KEY REFERENCES communities ON DELETE CASCADE,
    member_count int NOT NULL DEFAULT 0,
    post_count int NOT NULL DEFAULT 0,
    last_post_at timestamp(0) with time zone,
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS community_members (
    user_id bigint REFERENCES users ON DELETE CASCADE,
    community_id bigint REFERENCES communities ON DELETE CASCADE,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members ON community_members(community_id);
