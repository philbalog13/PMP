-- Migration 012: Legacy cursus seed compatibility
-- Makes current schema backward-compatible with legacy seed files (bloc2-5 quizzes/exercises).

-- -----------------------------------------------------------------------------
-- cursus_quizzes: legacy columns + compatibility
-- -----------------------------------------------------------------------------
ALTER TABLE learning.cursus_quizzes
    ADD COLUMN IF NOT EXISTS questions JSONB,
    ADD COLUMN IF NOT EXISTS passing_score INTEGER;

UPDATE learning.cursus_quizzes
SET passing_score = pass_percentage
WHERE passing_score IS NULL;

CREATE OR REPLACE FUNCTION learning.normalize_cursus_quiz_legacy()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cursus_id IS NULL AND NEW.module_id IS NOT NULL THEN
        SELECT cm.cursus_id INTO NEW.cursus_id
        FROM learning.cursus_modules cm
        WHERE cm.id = NEW.module_id
        LIMIT 1;
    END IF;

    IF NEW.pass_percentage IS NULL THEN
        IF NEW.passing_score IS NOT NULL THEN
            NEW.pass_percentage := NEW.passing_score;
        ELSE
            NEW.pass_percentage := 80;
        END IF;
    END IF;

    IF NEW.passing_score IS NULL THEN
        NEW.passing_score := NEW.pass_percentage;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cursus_quiz_legacy_normalize ON learning.cursus_quizzes;
CREATE TRIGGER trg_cursus_quiz_legacy_normalize
    BEFORE INSERT OR UPDATE ON learning.cursus_quizzes
    FOR EACH ROW EXECUTE FUNCTION learning.normalize_cursus_quiz_legacy();

CREATE OR REPLACE FUNCTION learning.sync_cursus_quiz_questions_from_legacy()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    q_text TEXT;
    q_options JSONB;
    q_correct INTEGER;
    q_explanation TEXT;
BEGIN
    IF NEW.questions IS NULL OR jsonb_typeof(NEW.questions) <> 'array' THEN
        RETURN NEW;
    END IF;

    -- Keep explicit modern quiz question rows untouched.
    IF EXISTS (
        SELECT 1
        FROM learning.cursus_quiz_questions qq
        WHERE qq.quiz_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    FOR item IN
        SELECT elem, ordinality AS idx
        FROM jsonb_array_elements(NEW.questions) WITH ORDINALITY AS t(elem, ordinality)
    LOOP
        q_text := COALESCE(item.elem->>'question', item.elem->>'title', 'Question ' || item.idx::TEXT);
        q_options := COALESCE(item.elem->'options', '[]'::jsonb);
        q_correct := COALESCE(
            NULLIF(item.elem->>'correct_option_index', '')::INTEGER,
            NULLIF(item.elem->>'correct', '')::INTEGER,
            0
        );
        q_explanation := item.elem->>'explanation';

        INSERT INTO learning.cursus_quiz_questions (
            id,
            quiz_id,
            question,
            options,
            correct_option_index,
            explanation,
            question_order
        )
        VALUES (
            NEW.id || '-q-' || item.idx::TEXT,
            NEW.id,
            q_text,
            q_options,
            q_correct,
            q_explanation,
            item.idx::INTEGER
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cursus_quiz_legacy_sync_questions ON learning.cursus_quizzes;
CREATE TRIGGER trg_cursus_quiz_legacy_sync_questions
    AFTER INSERT ON learning.cursus_quizzes
    FOR EACH ROW EXECUTE FUNCTION learning.sync_cursus_quiz_questions_from_legacy();

-- -----------------------------------------------------------------------------
-- cursus_exercises: legacy columns + compatibility
-- -----------------------------------------------------------------------------
ALTER TABLE learning.cursus_exercises
    ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10),
    ADD COLUMN IF NOT EXISTS exercise_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS expected_output TEXT;

UPDATE learning.cursus_exercises
SET exercise_type = type
WHERE exercise_type IS NULL
  AND type IS NOT NULL;

CREATE OR REPLACE FUNCTION learning.normalize_cursus_exercise_legacy()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type IS NULL AND NEW.exercise_type IS NOT NULL THEN
        NEW.type := NEW.exercise_type;
    END IF;

    IF NEW.exercise_type IS NULL AND NEW.type IS NOT NULL THEN
        NEW.exercise_type := NEW.type;
    END IF;

    IF NEW.type IS NULL THEN
        NEW.type := 'PRATIQUE';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cursus_exercise_legacy_normalize ON learning.cursus_exercises;
CREATE TRIGGER trg_cursus_exercise_legacy_normalize
    BEFORE INSERT OR UPDATE ON learning.cursus_exercises
    FOR EACH ROW EXECUTE FUNCTION learning.normalize_cursus_exercise_legacy();
