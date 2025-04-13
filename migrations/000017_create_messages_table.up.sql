CREATE TABLE IF NOT EXISTS conversations (
    conversation_pid bigint PRIMARY KEY DEFAULT next_id(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id bigint REFERENCES conversations(conversation_pid) ON DELETE CASCADE,
    user_id bigint REFERENCES users(user_pid) ON DELETE CASCADE,
    PRIMARY KEY(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    message_pid bigint PRIMARY KEY DEFAULT next_id(),
    conversation_id bigint REFERENCES conversations(conversation_pid) ON DELETE CASCADE,
    sender_id bigint REFERENCES users(user_pid) ON DELETE SET NULL,
    messages text,
    image_url text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
