-- Migration 011: CTF Security Labs
-- Adds CTF challenge catalog, guided/free mode progress, submissions, hints and leaderboard.

CREATE SCHEMA IF NOT EXISTS learning;

CREATE OR REPLACE FUNCTION learning.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TABLE IF NOT EXISTS learning.ctf_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_code VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(40) NOT NULL CHECK (category IN (
        'PIN_CRACKING',
        'REPLAY_ATTACK',
        'MITM',
        'FRAUD_CNP',
        'ISO8583_MANIPULATION',
        'HSM_ATTACK',
        '3DS_BYPASS',
        'CRYPTO_WEAKNESS',
        'PRIVILEGE_ESCALATION'
    )),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    points INTEGER NOT NULL CHECK (points > 0),
    flag_value VARCHAR(255) NOT NULL,
    prerequisite_challenge_code VARCHAR(30),
    target_service TEXT,
    target_endpoint TEXT,
    vulnerability_type TEXT,
    attack_vector TEXT,
    learning_objectives JSONB DEFAULT '[]'::jsonb,
    estimated_minutes INTEGER DEFAULT 15 CHECK (estimated_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_ctf_prerequisite
        FOREIGN KEY (prerequisite_challenge_code)
        REFERENCES learning.ctf_challenges(challenge_code)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ctf_challenges_code ON learning.ctf_challenges(challenge_code);
CREATE INDEX IF NOT EXISTS idx_ctf_challenges_category ON learning.ctf_challenges(category);
CREATE INDEX IF NOT EXISTS idx_ctf_challenges_active ON learning.ctf_challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_ctf_challenges_prereq ON learning.ctf_challenges(prerequisite_challenge_code);

CREATE TABLE IF NOT EXISTS learning.ctf_guided_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES learning.ctf_challenges(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL CHECK (step_number > 0),
    step_title TEXT NOT NULL,
    step_description TEXT NOT NULL,
    step_type VARCHAR(20) NOT NULL CHECK (step_type IN (
        'EXPLANATION',
        'CURL_COMMAND',
        'CODE_SNIPPET',
        'OBSERVATION',
        'ANALYSIS',
        'EXPLOITATION'
    )),
    command_template TEXT,
    expected_output TEXT,
    hint_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(challenge_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_ctf_guided_steps_challenge_id ON learning.ctf_guided_steps(challenge_id);

CREATE TABLE IF NOT EXISTS learning.ctf_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES learning.ctf_challenges(id) ON DELETE CASCADE,
    hint_number INTEGER NOT NULL CHECK (hint_number > 0),
    hint_text TEXT NOT NULL,
    cost_points INTEGER NOT NULL DEFAULT 10 CHECK (cost_points >= 0),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(challenge_id, hint_number)
);

CREATE INDEX IF NOT EXISTS idx_ctf_hints_challenge_id ON learning.ctf_hints(challenge_id);

CREATE TABLE IF NOT EXISTS learning.ctf_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES learning.ctf_challenges(id) ON DELETE CASCADE,
    submitted_flag VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('GUIDED', 'FREE')),
    points_awarded INTEGER NOT NULL DEFAULT 0,
    hints_used INTEGER NOT NULL DEFAULT 0,
    is_first_blood BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctf_submissions_student ON learning.ctf_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_ctf_submissions_challenge ON learning.ctf_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_ctf_submissions_correct ON learning.ctf_submissions(is_correct);
CREATE INDEX IF NOT EXISTS idx_ctf_submissions_submitted_at ON learning.ctf_submissions(submitted_at DESC);

CREATE TABLE IF NOT EXISTS learning.ctf_student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES learning.ctf_challenges(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COMPLETED')),
    mode_preference VARCHAR(10) NOT NULL DEFAULT 'GUIDED' CHECK (mode_preference IN ('GUIDED', 'FREE')),
    current_guided_step INTEGER NOT NULL DEFAULT 1 CHECK (current_guided_step > 0),
    hints_unlocked INTEGER[] NOT NULL DEFAULT '{}'::INTEGER[],
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_ctf_progress_student ON learning.ctf_student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_ctf_progress_challenge ON learning.ctf_student_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_ctf_progress_status ON learning.ctf_student_progress(status);

DROP TRIGGER IF EXISTS update_ctf_challenges_updated_at ON learning.ctf_challenges;
CREATE TRIGGER update_ctf_challenges_updated_at
    BEFORE UPDATE ON learning.ctf_challenges
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ctf_student_progress_updated_at ON learning.ctf_student_progress;
CREATE TRIGGER update_ctf_student_progress_updated_at
    BEFORE UPDATE ON learning.ctf_student_progress
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

CREATE TABLE IF NOT EXISTS learning.ctf_badge_catalog (
    badge_type VARCHAR(80) PRIMARY KEY,
    badge_name VARCHAR(120) NOT NULL,
    badge_description TEXT,
    badge_icon VARCHAR(60),
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO learning.ctf_badge_catalog (badge_type, badge_name, badge_description, badge_icon, xp_awarded)
VALUES
    ('CTF_FIRST_FLAG', 'Premier Flag CTF', 'Capturer votre premier flag CTF', 'flag', 50),
    ('CTF_FIRST_BLOOD', 'First Blood', 'Etre le premier a resoudre un challenge', 'droplet', 200),
    ('CTF_HACKER', 'CTF Hacker', 'Resoudre 10 challenges CTF', 'terminal', 150),
    ('CTF_MASTER', 'CTF Master', 'Resoudre tous les challenges CTF actifs', 'crown', 500),
    ('CTF_CATEGORY_MASTER', 'Category Master', 'Completer une categorie CTF complete', 'layers', 100)
ON CONFLICT (badge_type) DO UPDATE SET
    badge_name = EXCLUDED.badge_name,
    badge_description = EXCLUDED.badge_description,
    badge_icon = EXCLUDED.badge_icon,
    xp_awarded = EXCLUDED.xp_awarded;

CREATE OR REPLACE VIEW learning.ctf_leaderboard AS
WITH solved AS (
    SELECT
        student_id,
        COUNT(DISTINCT CASE WHEN is_correct THEN challenge_id END)::INTEGER AS challenges_solved,
        COALESCE(SUM(CASE WHEN is_correct THEN points_awarded ELSE 0 END), 0)::INTEGER AS total_points,
        COUNT(*) FILTER (WHERE is_first_blood = true)::INTEGER AS first_bloods
    FROM learning.ctf_submissions
    GROUP BY student_id
)
SELECT
    u.id AS student_id,
    u.username,
    u.first_name,
    u.last_name,
    COALESCE(solved.challenges_solved, 0) AS challenges_solved,
    COALESCE(solved.total_points, 0) AS total_points,
    COALESCE(solved.first_bloods, 0) AS first_bloods,
    DENSE_RANK() OVER (
        ORDER BY
            COALESCE(solved.total_points, 0) DESC,
            COALESCE(solved.challenges_solved, 0) DESC,
            u.username ASC
    )::INTEGER AS rank
FROM users.users u
LEFT JOIN solved ON solved.student_id = u.id
WHERE u.role = 'ROLE_ETUDIANT'
ORDER BY
    COALESCE(solved.total_points, 0) DESC,
    COALESCE(solved.challenges_solved, 0) DESC,
    u.username ASC;
