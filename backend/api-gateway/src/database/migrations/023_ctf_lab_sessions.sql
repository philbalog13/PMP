-- Migration 023: TryHackMe-like lab sessions and room/task templates.

CREATE TABLE IF NOT EXISTS learning.ctf_lab_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(30) NOT NULL UNIQUE,
    challenge_code VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    default_ttl_minutes INTEGER NOT NULL DEFAULT 120 CHECK (default_ttl_minutes > 0 AND default_ttl_minutes <= 480),
    max_extension_minutes INTEGER NOT NULL DEFAULT 60 CHECK (max_extension_minutes >= 0 AND max_extension_minutes <= 180),
    manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning.ctf_lab_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES learning.ctf_lab_templates(id) ON DELETE CASCADE,
    task_id VARCHAR(60) NOT NULL,
    task_order INTEGER NOT NULL CHECK (task_order > 0),
    title VARCHAR(255) NOT NULL,
    has_machine BOOLEAN NOT NULL DEFAULT true,
    question_type VARCHAR(20) NOT NULL DEFAULT 'FLAG' CHECK (question_type IN ('FLAG', 'QUIZ', 'TEXT', 'MULTI')),
    requires_flag BOOLEAN NOT NULL DEFAULT false,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    task_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, task_id),
    UNIQUE(template_id, task_order)
);

CREATE TABLE IF NOT EXISTS learning.ctf_lab_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_code VARCHAR(50) NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    challenge_code VARCHAR(30) NOT NULL,
    template_id UUID NOT NULL REFERENCES learning.ctf_lab_templates(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PROVISIONING', 'RUNNING', 'STOPPED', 'EXPIRED', 'FAILED')),
    machine_ip INET,
    network_name VARCHAR(120),
    cidr_block CIDR,
    attackbox_path TEXT,
    attackbox_host VARCHAR(255),
    attackbox_port INTEGER,
    extension_count INTEGER NOT NULL DEFAULT 0 CHECK (extension_count >= 0),
    max_extensions INTEGER NOT NULL DEFAULT 1 CHECK (max_extensions >= 0),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    terminated_at TIMESTAMP,
    last_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning.ctf_lab_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES learning.ctf_lab_sessions(id) ON DELETE CASCADE,
    instance_kind VARCHAR(20) NOT NULL CHECK (instance_kind IN ('ATTACKBOX', 'TARGET')),
    instance_name VARCHAR(120) NOT NULL,
    container_id VARCHAR(128),
    image VARCHAR(255),
    internal_ip INET,
    access_host VARCHAR(255),
    access_port INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning.ctf_lab_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES learning.ctf_lab_sessions(id) ON DELETE CASCADE,
    event_name VARCHAR(80) NOT NULL,
    event_status VARCHAR(20) NOT NULL DEFAULT 'INFO',
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctf_lab_templates_active ON learning.ctf_lab_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_ctf_lab_templates_challenge_code ON learning.ctf_lab_templates(challenge_code);
CREATE INDEX IF NOT EXISTS idx_ctf_lab_tasks_template ON learning.ctf_lab_tasks(template_id, task_order);
CREATE INDEX IF NOT EXISTS idx_ctf_lab_sessions_student ON learning.ctf_lab_sessions(student_id, challenge_code);
CREATE INDEX IF NOT EXISTS idx_ctf_lab_sessions_status ON learning.ctf_lab_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_ctf_lab_instances_session ON learning.ctf_lab_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_ctf_lab_events_session ON learning.ctf_lab_events(session_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ctf_lab_sessions_active_per_student_challenge
    ON learning.ctf_lab_sessions(student_id, challenge_code)
    WHERE status IN ('PROVISIONING', 'RUNNING') AND terminated_at IS NULL;

DROP TRIGGER IF EXISTS update_ctf_lab_templates_updated_at ON learning.ctf_lab_templates;
CREATE TRIGGER update_ctf_lab_templates_updated_at
    BEFORE UPDATE ON learning.ctf_lab_templates
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ctf_lab_tasks_updated_at ON learning.ctf_lab_tasks;
CREATE TRIGGER update_ctf_lab_tasks_updated_at
    BEFORE UPDATE ON learning.ctf_lab_tasks
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ctf_lab_sessions_updated_at ON learning.ctf_lab_sessions;
CREATE TRIGGER update_ctf_lab_sessions_updated_at
    BEFORE UPDATE ON learning.ctf_lab_sessions
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ctf_lab_instances_updated_at ON learning.ctf_lab_instances;
CREATE TRIGGER update_ctf_lab_instances_updated_at
    BEFORE UPDATE ON learning.ctf_lab_instances
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

INSERT INTO learning.ctf_lab_templates (
    room_code,
    challenge_code,
    title,
    description,
    default_ttl_minutes,
    max_extension_minutes,
    manifest,
    is_active
)
VALUES
    (
        'PAY-001',
        'PAY-001',
        'The Unsecured Payment Terminal',
        'POS traffic interception and admin command injection.',
        120,
        60,
        jsonb_build_object(
            'roomCode', 'PAY-001',
            'ttlMinutes', 120,
            'targets', jsonb_build_array(
                jsonb_build_object('name', 'pos-terminal', 'image', 'pmp-ctf-pay001-pos', 'internalPort', 8080),
                jsonb_build_object('name', 'bank-backend', 'image', 'pmp-ctf-pay001-bank', 'internalPort', 9090)
            ),
            'entryTarget', 'pos-terminal',
            'flagPolicy', 'platform_dynamic'
        ),
        true
    ),
    (
        'PCI-001',
        'PCI-001',
        'PCI-DSS Showdown',
        'E-commerce SQLi plus PCI control validation tasks.',
        120,
        60,
        jsonb_build_object(
            'roomCode', 'PCI-001',
            'ttlMinutes', 120,
            'targets', jsonb_build_array(
                jsonb_build_object('name', 'pci-web', 'image', 'pmp-ctf-pci001-web', 'internalPort', 8080)
            ),
            'entryTarget', 'pci-web',
            'flagPolicy', 'platform_dynamic'
        ),
        true
    ),
    (
        'SOC-001',
        'SOC-001',
        'The Social Engineer''s Wire',
        'Artifact analysis room with no attack machine required.',
        120,
        60,
        jsonb_build_object(
            'roomCode', 'SOC-001',
            'ttlMinutes', 120,
            'targets', jsonb_build_array(),
            'entryTarget', null,
            'flagPolicy', 'task_answers'
        ),
        true
    ),
    (
        'API-001',
        'API-001',
        'API: Attack on Transactions',
        'Broken object authorization and transfer-limit bypass.',
        120,
        60,
        jsonb_build_object(
            'roomCode', 'API-001',
            'ttlMinutes', 120,
            'targets', jsonb_build_array(
                jsonb_build_object('name', 'payments-api', 'image', 'pmp-ctf-api001', 'internalPort', 5000)
            ),
            'entryTarget', 'payments-api',
            'flagPolicy', 'platform_dynamic'
        ),
        true
    ),
    (
        'DORA-001',
        'DORA-001',
        'DORA''s Recovery',
        'Two-phase attack and resilience recovery simulation.',
        120,
        60,
        jsonb_build_object(
            'roomCode', 'DORA-001',
            'ttlMinutes', 120,
            'targets', jsonb_build_array(
                jsonb_build_object('name', 'dora-frontend', 'image', 'pmp-ctf-dora001-frontend', 'internalPort', 8080),
                jsonb_build_object('name', 'dora-backend', 'image', 'pmp-ctf-dora001-backend', 'internalPort', 8081),
                jsonb_build_object('name', 'dora-core', 'image', 'pmp-ctf-dora001-core', 'internalPort', 8082)
            ),
            'entryTarget', 'dora-frontend',
            'flagPolicy', 'mixed_attack_recovery'
        ),
        true
    )
ON CONFLICT (room_code) DO UPDATE SET
    challenge_code = EXCLUDED.challenge_code,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    default_ttl_minutes = EXCLUDED.default_ttl_minutes,
    max_extension_minutes = EXCLUDED.max_extension_minutes,
    manifest = EXCLUDED.manifest,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

WITH template_map AS (
    SELECT id, room_code FROM learning.ctf_lab_templates
    WHERE room_code IN ('PAY-001', 'PCI-001', 'SOC-001', 'API-001', 'DORA-001')
)
INSERT INTO learning.ctf_lab_tasks (
    template_id,
    task_id,
    task_order,
    title,
    has_machine,
    question_type,
    requires_flag,
    points,
    task_payload
)
SELECT
    tm.id,
    seed.task_id,
    seed.task_order,
    seed.title,
    seed.has_machine,
    seed.question_type,
    seed.requires_flag,
    seed.points,
    seed.task_payload
FROM template_map tm
JOIN (
    VALUES
        ('PAY-001', 'PAY-001-T1', 1, 'Recon and capture cleartext payment traffic', true, 'FLAG', false, 40, '{"objective":"find_user_flag_in_transaction"}'::jsonb),
        ('PAY-001', 'PAY-001-T2', 2, 'Exploit POS admin command injection', true, 'FLAG', true, 110, '{"objective":"root_flag_via_command_injection"}'::jsonb),

        ('PCI-001', 'PCI-001-T1', 1, 'Find SQL injection in product search', true, 'QUIZ', false, 50, '{"objective":"discover_sqli"}'::jsonb),
        ('PCI-001', 'PCI-001-T2', 2, 'Extract user flag from cardholder data set', true, 'FLAG', true, 120, '{"objective":"dump_user_flag"}'::jsonb),

        ('SOC-001', 'SOC-001-T1', 1, 'Analyse suspicious emails and headers', false, 'QUIZ', false, 60, '{"objective":"identify_sender_spoof"}'::jsonb),
        ('SOC-001', 'SOC-001-T2', 2, 'Reconstruct fraud chain and submit final answer', false, 'TEXT', true, 90, '{"objective":"reconstruct_attack_story"}'::jsonb),

        ('API-001', 'API-001-T1', 1, 'Exploit BOLA to access another account', true, 'FLAG', false, 70, '{"objective":"read_foreign_transactions"}'::jsonb),
        ('API-001', 'API-001-T2', 2, 'Escalate to command injection endpoint', true, 'FLAG', true, 130, '{"objective":"root_flag_api_privesc"}'::jsonb),

        ('DORA-001', 'DORA-001-T1', 1, 'Initial compromise of vulnerable service', true, 'FLAG', false, 80, '{"phase":"attack"}'::jsonb),
        ('DORA-001', 'DORA-001-T2', 2, 'Validate recovery and post-mortem report', true, 'TEXT', true, 140, '{"phase":"recovery"}'::jsonb)
) AS seed(room_code, task_id, task_order, title, has_machine, question_type, requires_flag, points, task_payload)
    ON seed.room_code = tm.room_code
ON CONFLICT (template_id, task_id) DO UPDATE SET
    task_order = EXCLUDED.task_order,
    title = EXCLUDED.title,
    has_machine = EXCLUDED.has_machine,
    question_type = EXCLUDED.question_type,
    requires_flag = EXCLUDED.requires_flag,
    points = EXCLUDED.points,
    task_payload = EXCLUDED.task_payload,
    updated_at = NOW();
