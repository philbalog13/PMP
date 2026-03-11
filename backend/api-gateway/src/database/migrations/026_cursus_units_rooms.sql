-- Migration 026: Cursus Units ("UA rooms") structure
-- New pedagogical hierarchy:
--   Cursus -> Module -> Unite d'apprentissage (UA)
-- Keeps legacy cursus_chapters compatibility.

CREATE SCHEMA IF NOT EXISTS learning;

CREATE TABLE IF NOT EXISTS learning.cursus_units (
    id VARCHAR(120) PRIMARY KEY,
    module_id VARCHAR(80) NOT NULL REFERENCES learning.cursus_modules(id) ON DELETE CASCADE,
    unit_code VARCHAR(40) NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    room_style VARCHAR(20) NOT NULL DEFAULT 'THM'
        CHECK (room_style IN ('THM', 'GUIDED', 'HYBRID')),
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    source_pages INTEGER CHECK (source_pages IS NULL OR source_pages > 0),
    structure_label VARCHAR(80),
    content_markdown TEXT NOT NULL DEFAULT '',
    learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    resources JSONB NOT NULL DEFAULT '[]'::jsonb,
    unit_order INTEGER NOT NULL CHECK (unit_order > 0),
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (module_id, unit_order),
    UNIQUE (module_id, unit_code)
);

CREATE INDEX IF NOT EXISTS idx_cursus_units_module_order
    ON learning.cursus_units(module_id, unit_order);
CREATE INDEX IF NOT EXISTS idx_cursus_units_module_published
    ON learning.cursus_units(module_id, is_published);

CREATE TABLE IF NOT EXISTS learning.cursus_unit_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id VARCHAR(120) NOT NULL REFERENCES learning.cursus_units(id) ON DELETE CASCADE,
    task_code VARCHAR(80),
    task_order INTEGER NOT NULL CHECK (task_order > 0),
    title VARCHAR(255) NOT NULL,
    prompt TEXT,
    task_type VARCHAR(24) NOT NULL DEFAULT 'READING'
        CHECK (task_type IN ('READING', 'QUIZ', 'EXERCISE', 'CHECKLIST', 'RESOURCE', 'VALIDATION')),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    answer_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    hints JSONB NOT NULL DEFAULT '[]'::jsonb,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (unit_id, task_order)
);

CREATE INDEX IF NOT EXISTS idx_cursus_unit_tasks_unit_order
    ON learning.cursus_unit_tasks(unit_id, task_order);
CREATE INDEX IF NOT EXISTS idx_cursus_unit_tasks_type
    ON learning.cursus_unit_tasks(task_type);

DROP TRIGGER IF EXISTS update_cursus_units_updated_at ON learning.cursus_units;
CREATE TRIGGER update_cursus_units_updated_at
    BEFORE UPDATE ON learning.cursus_units
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cursus_unit_tasks_updated_at ON learning.cursus_unit_tasks;
CREATE TRIGGER update_cursus_unit_tasks_updated_at
    BEFORE UPDATE ON learning.cursus_unit_tasks
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();
