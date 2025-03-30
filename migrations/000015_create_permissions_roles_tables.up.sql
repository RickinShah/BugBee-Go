CREATE TABLE IF NOT EXISTS community_roles (
    role_pid bigserial PRIMARY KEY,
    community_id bigint REFERENCES communities ON DELETE CASCADE,
    name citext NOT NULL,
    CONSTRAINT unique_roles UNIQUE (name, community_id)
);

CREATE TABLE IF NOT EXISTS permissions (
    permission_pid bigserial PRIMARY KEY,
    code citext NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id bigint REFERENCES community_roles ON DELETE CASCADE,
    permission_id bigint REFERENCES permissions,
    PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id bigint REFERENCES users,
    community_id bigint REFERENCES communities ON DELETE CASCADE,
    role_id bigint REFERENCES community_roles ON DELETE CASCADE,
    PRIMARY KEY(user_id, community_id)
);
