-- ==========================================================
-- Add Audit Logs Table  
-- ==========================================================

-- Create audit_logs table in security schema
CREATE TABLE IF NOT EXISTS security.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users.users(id) ON DELETE SET NULL,
    username VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON security.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON security.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON security.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_success ON security.audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_ip_address ON security.audit_logs(ip_address);

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_audit_metadata ON security.audit_logs USING GIN(metadata);

-- Comments
COMMENT ON TABLE security.audit_logs IS 'Security audit trail for authentication and authorization events';
COMMENT ON COLUMN security.audit_logs.event_type IS 'Type of security event (LOGIN_SUCCESS, LOGIN_FAILED, etc.)';
COMMENT ON COLUMN security.audit_logs.metadata IS 'Additional context data in JSON format';

\echo '✅ Audit logs table created successfully';
