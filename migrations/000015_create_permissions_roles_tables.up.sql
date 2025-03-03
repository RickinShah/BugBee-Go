CREATE TABLE IF NOT EXISTS roles (
    role_pid bigserial PRIMARY KEY,
    community_id bigint REFERENCES communities,
    name text NOT NULL,
    CONSTRAINT unique_roles UNIQUE (name, community_id)
);

CREATE TABLE IF NOT EXISTS permissions (
    permission_pid bigserial PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id bigint REFERENCES roles,
    permission_id bigint REFERENCES permissions,
    PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id bigint REFERENCES users,
    community_id bigint REFERENCES communities,
    role_id bigint REFERENCES roles,
    PRIMARY KEY(user_id, community_id),
    CONSTRAINT unique_user_roles UNIQUE (user_id, community_id)
);
