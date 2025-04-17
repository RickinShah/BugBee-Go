CREATE TABLE IF NOT EXISTS channel_messages (
    message_pid bigint PRIMARY KEY DEFAULT next_id(),
    channel_id bigint REFERENCES channels ON DELETE CASCADE,
    sender_id bigint REFERENCES users ON DELETE CASCADE,
    message text,
    image_url text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
