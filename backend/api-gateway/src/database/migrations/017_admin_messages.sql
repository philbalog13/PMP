-- Migration 017: Admin messages table
-- Platform messages sent by FORMATEUR admins to clients

CREATE TABLE IF NOT EXISTS client.admin_messages (
    id          SERIAL PRIMARY KEY,
    client_id   UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    admin_id    UUID REFERENCES users.users(id) ON DELETE SET NULL,
    subject     VARCHAR(255) NOT NULL,
    content     TEXT NOT NULL,
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_client_id ON client.admin_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON client.admin_messages(created_at DESC);
