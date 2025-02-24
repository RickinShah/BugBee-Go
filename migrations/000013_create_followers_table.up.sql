CREATE TABLE IF NOT EXISTS followers (
    follower_id bigint REFERENCES users ON DELETE CASCADE,
    followee_id bigint REFERENCES users ON DELETE CASCADE,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY(follower_id, followee_id)
);
