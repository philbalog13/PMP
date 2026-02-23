-- Migration 020: Phase 3 Learn by Hacking + PBL instrumentation for CTF
-- Adds mission/debrief/rubric metadata, multi-axis scoring, anti-spoil support, telemetry, and trainer analytics.

CREATE SCHEMA IF NOT EXISTS learning;

ALTER TABLE learning.ctf_challenges
    ADD COLUMN IF NOT EXISTS mission_brief JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS incident_artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS proof_rubric JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE learning.ctf_student_progress
    ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS learner_profile VARCHAR(20) NOT NULL DEFAULT 'INTERMEDIATE',
    ADD COLUMN IF NOT EXISTS debrief_completed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'learning'
          AND t.relname = 'ctf_student_progress'
          AND c.conname = 'ctf_student_progress_learner_profile_check'
    ) THEN
        ALTER TABLE learning.ctf_student_progress
            ADD CONSTRAINT ctf_student_progress_learner_profile_check
            CHECK (learner_profile IN ('NOVICE', 'INTERMEDIATE', 'ADVANCED'));
    END IF;
END $$;

ALTER TABLE learning.ctf_submissions
    ADD COLUMN IF NOT EXISTS axis_time_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS axis_proof_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS axis_patch_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS axis_total_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS scoring_version VARCHAR(30) NOT NULL DEFAULT 'axis-v1',
    ADD COLUMN IF NOT EXISTS feedback_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS submission_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS learning.ctf_debriefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES learning.ctf_challenges(id) ON DELETE CASCADE,
    root_cause TEXT NOT NULL,
    impact_summary TEXT NOT NULL,
    mitigation_priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_summary TEXT NOT NULL,
    technical_score INTEGER NOT NULL DEFAULT 0 CHECK (technical_score BETWEEN 0 AND 100),
    communication_score INTEGER NOT NULL DEFAULT 0 CHECK (communication_score BETWEEN 0 AND 100),
    patch_score INTEGER NOT NULL DEFAULT 0 CHECK (patch_score BETWEEN 0 AND 100),
    completed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_ctf_debriefs_student ON learning.ctf_debriefs(student_id);
CREATE INDEX IF NOT EXISTS idx_ctf_debriefs_challenge ON learning.ctf_debriefs(challenge_id);

DROP TRIGGER IF EXISTS update_ctf_debriefs_updated_at ON learning.ctf_debriefs;
CREATE TRIGGER update_ctf_debriefs_updated_at
    BEFORE UPDATE ON learning.ctf_debriefs
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

CREATE TABLE IF NOT EXISTS learning.ctf_learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users.users(id) ON DELETE SET NULL,
    challenge_id UUID REFERENCES learning.ctf_challenges(id) ON DELETE SET NULL,
    event_name VARCHAR(80) NOT NULL,
    event_source VARCHAR(40) NOT NULL DEFAULT 'api',
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctf_learning_events_student ON learning.ctf_learning_events(student_id);
CREATE INDEX IF NOT EXISTS idx_ctf_learning_events_challenge ON learning.ctf_learning_events(challenge_id);
CREATE INDEX IF NOT EXISTS idx_ctf_learning_events_name ON learning.ctf_learning_events(event_name);
CREATE INDEX IF NOT EXISTS idx_ctf_learning_events_created ON learning.ctf_learning_events(created_at DESC);

CREATE OR REPLACE VIEW learning.ctf_trainer_overview AS
WITH started_completed AS (
    SELECT
        p.challenge_id,
        COUNT(*) FILTER (WHERE p.started_at IS NOT NULL)::INTEGER AS started_count,
        COUNT(*) FILTER (WHERE p.status = 'COMPLETED')::INTEGER AS completed_count,
        COUNT(*) FILTER (WHERE p.status = 'IN_PROGRESS')::INTEGER AS in_progress_count
    FROM learning.ctf_student_progress p
    GROUP BY p.challenge_id
),
debrief_counts AS (
    SELECT
        d.challenge_id,
        COUNT(*)::INTEGER AS debrief_count
    FROM learning.ctf_debriefs d
    GROUP BY d.challenge_id
),
axis_scores AS (
    SELECT
        s.challenge_id,
        COALESCE(ROUND(AVG(s.axis_time_score), 2), 0) AS avg_time_score,
        COALESCE(ROUND(AVG(s.axis_proof_score), 2), 0) AS avg_proof_score,
        COALESCE(ROUND(AVG(s.axis_patch_score), 2), 0) AS avg_patch_score,
        COALESCE(ROUND(AVG(s.axis_total_score), 2), 0) AS avg_axis_score
    FROM learning.ctf_submissions s
    WHERE s.is_correct = true
    GROUP BY s.challenge_id
)
SELECT
    c.id AS challenge_id,
    c.challenge_code,
    c.title,
    c.category,
    COALESCE(sc.started_count, 0) AS started_count,
    COALESCE(sc.completed_count, 0) AS completed_count,
    COALESCE(sc.in_progress_count, 0) AS in_progress_count,
    COALESCE(dc.debrief_count, 0) AS debrief_count,
    COALESCE(ax.avg_time_score, 0) AS avg_time_score,
    COALESCE(ax.avg_proof_score, 0) AS avg_proof_score,
    COALESCE(ax.avg_patch_score, 0) AS avg_patch_score,
    COALESCE(ax.avg_axis_score, 0) AS avg_axis_score,
    CASE
        WHEN COALESCE(sc.started_count, 0) = 0 THEN 0
        ELSE ROUND(((COALESCE(sc.started_count, 0) - COALESCE(sc.completed_count, 0))::NUMERIC / sc.started_count) * 100, 2)
    END AS dropoff_rate,
    CASE
        WHEN COALESCE(sc.completed_count, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(dc.debrief_count, 0)::NUMERIC / sc.completed_count) * 100, 2)
    END AS debrief_coverage_rate
FROM learning.ctf_challenges c
LEFT JOIN started_completed sc ON sc.challenge_id = c.id
LEFT JOIN debrief_counts dc ON dc.challenge_id = c.id
LEFT JOIN axis_scores ax ON ax.challenge_id = c.id
WHERE c.is_active = true;
