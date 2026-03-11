-- Migration 025: purge legacy pedagogical content
-- Scope:
--   - Remove legacy cursus/module/chapter/quiz/exercise data
--   - Remove defense sandbox exercises/quizzes state
--   - Keep all CTF data untouched (tables prefixed with learning.ctf_)

DO $$
BEGIN
    -- Cursus exercise attempts (optional table from seed patch)
    IF to_regclass('learning.cursus_exercise_attempts') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus_exercise_attempts';
    END IF;

    -- Explicit child-first cleanup for robustness across schema variants.
    IF to_regclass('learning.cursus_quiz_results') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus_quiz_results';
    END IF;

    IF to_regclass('learning.cursus_progress') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus_progress';
    END IF;

    IF to_regclass('learning.cursus_quiz_questions') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus_quiz_questions';
    END IF;

    IF to_regclass('learning.cursus_exercises') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus_exercises';
    END IF;

    IF to_regclass('learning.cursus_quizzes') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus_quizzes';
    END IF;

    IF to_regclass('learning.cursus_chapters') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus_chapters';
    END IF;

    IF to_regclass('learning.cursus_modules') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus_modules';
    END IF;

    IF to_regclass('learning.cursus') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.cursus';
    END IF;
END $$;

DO $$
BEGIN
    -- Defense sandbox cleanup (not CTF).
    IF to_regclass('learning.resource_overrides') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.resource_overrides';
    END IF;

    IF to_regclass('learning.student_vuln_state') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.student_vuln_state';
    END IF;

    IF to_regclass('learning.defense_quizzes') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.defense_quizzes';
    END IF;

    IF to_regclass('learning.vuln_catalog') IS NOT NULL THEN
        EXECUTE 'DELETE FROM learning.vuln_catalog';
    END IF;
END $$;
