-- Migration 027: UA progression, UA lab config, and lab session scope separation.

CREATE SCHEMA IF NOT EXISTS learning;

/* ------------------------------------------------------------------ */
/*  Extend lab sessions for flow/source scoping                        */
/* ------------------------------------------------------------------ */

ALTER TABLE learning.ctf_lab_sessions
    ADD COLUMN IF NOT EXISTS flow_source VARCHAR(20);

UPDATE learning.ctf_lab_sessions
SET flow_source = 'CTF'
WHERE flow_source IS NULL;

ALTER TABLE learning.ctf_lab_sessions
    ALTER COLUMN flow_source SET DEFAULT 'CTF';

ALTER TABLE learning.ctf_lab_sessions
    ALTER COLUMN flow_source SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ctf_lab_sessions_flow_source_check'
          AND conrelid = 'learning.ctf_lab_sessions'::regclass
    ) THEN
        ALTER TABLE learning.ctf_lab_sessions
            ADD CONSTRAINT ctf_lab_sessions_flow_source_check
            CHECK (flow_source IN ('CTF', 'UA'));
    END IF;
END $$;

ALTER TABLE learning.ctf_lab_sessions
    ADD COLUMN IF NOT EXISTS session_scope_key VARCHAR(160);

UPDATE learning.ctf_lab_sessions
SET session_scope_key = COALESCE(session_scope_key, challenge_code)
WHERE session_scope_key IS NULL;

ALTER TABLE learning.ctf_lab_sessions
    ALTER COLUMN session_scope_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ctf_lab_sessions_scope
    ON learning.ctf_lab_sessions(student_id, session_scope_key);

DROP INDEX IF EXISTS learning.ux_ctf_lab_sessions_active_per_student_challenge;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ctf_lab_sessions_active_per_student_scope
    ON learning.ctf_lab_sessions(student_id, session_scope_key)
    WHERE status IN ('PROVISIONING', 'RUNNING') AND terminated_at IS NULL;

/* ------------------------------------------------------------------ */
/*  UA machine config                                                   */
/* ------------------------------------------------------------------ */

CREATE TABLE IF NOT EXISTS learning.cursus_unit_lab_config (
    unit_id VARCHAR(120) PRIMARY KEY REFERENCES learning.cursus_units(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES learning.ctf_lab_templates(id) ON DELETE RESTRICT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_start BOOLEAN NOT NULL DEFAULT false,
    ttl_override_minutes INTEGER CHECK (ttl_override_minutes IS NULL OR ttl_override_minutes > 0),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cursus_unit_lab_config_template
    ON learning.cursus_unit_lab_config(template_id);

/* ------------------------------------------------------------------ */
/*  UA progress                                                         */
/* ------------------------------------------------------------------ */

CREATE TABLE IF NOT EXISTS learning.cursus_unit_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    unit_id VARCHAR(120) NOT NULL REFERENCES learning.cursus_units(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'UNLOCKED'
        CHECK (status IN ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COMPLETED')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_cursus_unit_progress_student
    ON learning.cursus_unit_progress(student_id, status);

CREATE INDEX IF NOT EXISTS idx_cursus_unit_progress_unit
    ON learning.cursus_unit_progress(unit_id, status);

CREATE TABLE IF NOT EXISTS learning.cursus_unit_task_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_id UUID NOT NULL REFERENCES learning.cursus_unit_progress(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES learning.cursus_unit_tasks(id) ON DELETE CASCADE,
    task_order INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'LOCKED'
        CHECK (status IN ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COMPLETED')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    completed_at TIMESTAMP,
    last_submission_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(progress_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_cursus_unit_task_progress_progress
    ON learning.cursus_unit_task_progress(progress_id, task_order);

CREATE TABLE IF NOT EXISTS learning.cursus_unit_task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_id UUID NOT NULL REFERENCES learning.cursus_unit_progress(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES learning.cursus_unit_tasks(id) ON DELETE CASCADE,
    submitted_answer TEXT,
    submitted_answer_hash TEXT,
    is_correct BOOLEAN NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
    feedback TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cursus_unit_task_submissions_progress
    ON learning.cursus_unit_task_submissions(progress_id, submitted_at DESC);

/* ------------------------------------------------------------------ */
/*  Triggers                                                           */
/* ------------------------------------------------------------------ */

DROP TRIGGER IF EXISTS update_cursus_unit_lab_config_updated_at ON learning.cursus_unit_lab_config;
CREATE TRIGGER update_cursus_unit_lab_config_updated_at
    BEFORE UPDATE ON learning.cursus_unit_lab_config
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cursus_unit_progress_updated_at ON learning.cursus_unit_progress;
CREATE TRIGGER update_cursus_unit_progress_updated_at
    BEFORE UPDATE ON learning.cursus_unit_progress
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cursus_unit_task_progress_updated_at ON learning.cursus_unit_task_progress;
CREATE TRIGGER update_cursus_unit_task_progress_updated_at
    BEFORE UPDATE ON learning.cursus_unit_task_progress
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

/* ------------------------------------------------------------------ */
/*  Seed sample UA data (safe, idempotent)                            */
/* ------------------------------------------------------------------ */

DO $$
DECLARE
    v_module_id TEXT := 'mod-1-fondamentaux-comptables-financiers';
    v_unit_no_lab TEXT := 'mod-1-fondamentaux-comptables-financiers-ua-12';
    v_unit_with_lab TEXT := 'mod-1-fondamentaux-comptables-financiers-ua-13';
    v_template_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM learning.cursus_modules WHERE id = v_module_id) THEN
        INSERT INTO learning.cursus_units (
            id,
            module_id,
            unit_code,
            title,
            summary,
            room_style,
            duration_minutes,
            structure_label,
            content_markdown,
            learning_objectives,
            validation_checklist,
            resources,
            unit_order,
            is_published
        ) VALUES (
            v_unit_no_lab,
            v_module_id,
            '1.2',
            'Atelier validation procedurale (sans machine)',
            'UA orientee verification des controles et preuves ecrites.',
            'GUIDED',
            45,
            'ACOR',
            '# UA 1.2\n\nTravaillez les controles et justifiez les preuves attendues.',
            '["Verifier les points de controle", "Produire une justification claire"]'::jsonb,
            '["Toutes les taches requises completees"]'::jsonb,
            '[]'::jsonb,
            102,
            true
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO learning.cursus_units (
            id,
            module_id,
            unit_code,
            title,
            summary,
            room_style,
            duration_minutes,
            structure_label,
            content_markdown,
            learning_objectives,
            validation_checklist,
            resources,
            unit_order,
            is_published
        ) VALUES (
            v_unit_with_lab,
            v_module_id,
            '1.3',
            'Atelier technique avec machine lab',
            'UA avec progression de taches techniques et validation finale flag.',
            'THM',
            60,
            'ACOR',
            '# UA 1.3\n\nProgression technique avec machine dediee.',
            '["Demarrer la machine de lab", "Valider les taches techniques", "Soumettre le flag final"]'::jsonb,
            '["Toutes les taches requises completees"]'::jsonb,
            '[]'::jsonb,
            103,
            true
        )
        ON CONFLICT (id) DO NOTHING;

        -- Tasks UA sans machine
        INSERT INTO learning.cursus_unit_tasks (unit_id, task_code, task_order, title, prompt, task_type, answer_schema, points, is_required)
        VALUES
            (v_unit_no_lab, 'UA12-T1', 1, 'Lecture du contexte', 'Lisez le contexte et marquez la tache comme terminee.', 'READING', '{"mode":"MARK_DONE"}'::jsonb, 5, true),
            (v_unit_no_lab, 'UA12-T2', 2, 'Quiz de verification', 'Selectionnez la bonne option.', 'QUIZ', '{"mode":"QUIZ_SINGLE","correctOptionIndex":1}'::jsonb, 10, true),
            (v_unit_no_lab, 'UA12-T3', 3, 'Conclusion', 'Soumettez une conclusion avec les mots cles: controle, preuve.', 'EXERCISE', '{"mode":"KEYWORDS","keywords":["controle","preuve"]}'::jsonb, 10, true)
        ON CONFLICT (unit_id, task_order) DO NOTHING;

        -- Tasks UA avec machine
        INSERT INTO learning.cursus_unit_tasks (unit_id, task_code, task_order, title, prompt, task_type, answer_schema, points, is_required)
        VALUES
            (v_unit_with_lab, 'UA13-T1', 1, 'Demarrage lab', 'Demarrez la session machine puis marquez termine.', 'CHECKLIST', '{"mode":"MARK_DONE"}'::jsonb, 5, true),
            (v_unit_with_lab, 'UA13-T2', 2, 'Validation intermediaire', 'Soumettez une reponse contenant reconnaissance.', 'VALIDATION', '{"mode":"KEYWORDS","keywords":["reconnaissance"]}'::jsonb, 10, true),
            (v_unit_with_lab, 'UA13-T3', 3, 'Flag final', 'Soumettez le flag final de l''UA.', 'VALIDATION', '{"mode":"FLAG","expectedFlag":"PMP{UA13_FINAL_FLAG}"}'::jsonb, 20, true)
        ON CONFLICT (unit_id, task_order) DO NOTHING;

        SELECT id INTO v_template_id
        FROM learning.ctf_lab_templates
        WHERE room_code = 'PAY-001'
        LIMIT 1;

        IF v_template_id IS NOT NULL THEN
            INSERT INTO learning.cursus_unit_lab_config (
                unit_id,
                template_id,
                is_enabled,
                auto_start,
                ttl_override_minutes,
                metadata
            ) VALUES (
                v_unit_with_lab,
                v_template_id,
                true,
                false,
                60,
                '{"seed":"migration_027"}'::jsonb
            )
            ON CONFLICT (unit_id) DO NOTHING;
        END IF;

        UPDATE learning.cursus_modules
        SET chapter_count = COALESCE((
            SELECT COUNT(*)::int FROM learning.cursus_units cu WHERE cu.module_id = v_module_id AND cu.is_published = true
        ), chapter_count),
            updated_at = NOW()
        WHERE id = v_module_id;
    END IF;
END $$;
