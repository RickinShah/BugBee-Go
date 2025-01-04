CREATE TABLE IF NOT EXISTS otps (
    user_pid bigint PRIMARY KEY,
    created_at timestamp with time zone NOT NULL,
    secret_key TEXT NOT NULL,
    expiry timestamp with time zone NOT NULL,
    CONSTRAINT fk_otps_users
        FOREIGN KEY (user_pid)
            REFERENCES users (user_pid)
            ON DELETE CASCADE
)
