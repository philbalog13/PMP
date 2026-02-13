-- Migration 004: Labs/Workshops optimization (performance + data integrity)
-- Adds targeted indexes, fixes leaderboard aggregation, and hardens constraints.

-- =============================================================================
-- DATA CLEANUP (safe normalization before constraints)
-- =============================================================================
UPDATE learning.student_progress
SET
    total_sections = CASE
        WHEN total_sections IS NULL OR total_sections < 1 THEN 1
        ELSE total_sections
    END,
    current_section = GREATEST(
        0,
        LEAST(
            COALESCE(current_section, 0),
            GREATEST(COALESCE(total_sections, 1), 1)
        )
    ),
    progress_percent = CASE
        WHEN progress_percent IS NULL OR progress_percent < 0 THEN 0
        WHEN progress_percent > 100 THEN 100
        ELSE progress_percent
    END,
    time_spent_minutes = CASE
        WHEN time_spent_minutes IS NULL OR time_spent_minutes < 0 THEN 0
        ELSE time_spent_minutes
    END;

UPDATE learning.quiz_results
SET
    attempt_number = CASE
        WHEN attempt_number IS NULL OR attempt_number < 1 THEN 1
        ELSE attempt_number
    END,
    time_taken_seconds = CASE
        WHEN time_taken_seconds IS NOT NULL AND time_taken_seconds < 0 THEN 0
        ELSE time_taken_seconds
    END;

UPDATE learning.exercises
SET
    points = CASE
        WHEN points IS NULL OR points < 0 THEN 0
        ELSE points
    END,
    time_limit_minutes = CASE
        WHEN time_limit_minutes IS NOT NULL AND time_limit_minutes <= 0 THEN NULL
        ELSE time_limit_minutes
    END;

UPDATE learning.exercise_assignments
SET grade = NULL
WHERE grade IS NOT NULL AND (grade < 0 OR grade > 100);

-- Remove duplicate assignments to support deterministic ON CONFLICT behavior.
DELETE FROM learning.exercise_assignments ea
USING learning.exercise_assignments dup
WHERE ea.id > dup.id
  AND ea.exercise_id = dup.exercise_id
  AND ea.student_id = dup.student_id
  AND ea.student_id IS NOT NULL;

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_student_progress_sections_valid'
          AND connamespace = 'learning'::regnamespace
    ) THEN
        ALTER TABLE learning.student_progress
            ADD CONSTRAINT ck_student_progress_sections_valid
            CHECK (total_sections >= 1 AND current_section >= 0 AND current_section <= total_sections);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_student_progress_time_non_negative'
          AND connamespace = 'learning'::regnamespace
    ) THEN
        ALTER TABLE learning.student_progress
            ADD CONSTRAINT ck_student_progress_time_non_negative
            CHECK (time_spent_minutes >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_quiz_results_attempt_positive'
          AND connamespace = 'learning'::regnamespace
    ) THEN
        ALTER TABLE learning.quiz_results
            ADD CONSTRAINT ck_quiz_results_attempt_positive
            CHECK (attempt_number >= 1);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_quiz_results_time_non_negative'
          AND connamespace = 'learning'::regnamespace
    ) THEN
        ALTER TABLE learning.quiz_results
            ADD CONSTRAINT ck_quiz_results_time_non_negative
            CHECK (time_taken_seconds IS NULL OR time_taken_seconds >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_exercises_points_non_negative'
          AND connamespace = 'learning'::regnamespace
    ) THEN
        ALTER TABLE learning.exercises
            ADD CONSTRAINT ck_exercises_points_non_negative
            CHECK (points >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_exercises_time_limit_positive'
          AND connamespace = 'learning'::regnamespace
    ) THEN
        ALTER TABLE learning.exercises
            ADD CONSTRAINT ck_exercises_time_limit_positive
            CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_exercise_assignments_grade_range'
          AND connamespace = 'learning'::regnamespace
    ) THEN
        ALTER TABLE learning.exercise_assignments
            ADD CONSTRAINT ck_exercise_assignments_grade_range
            CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_exercise_assignments_exercise_student'
          AND connamespace = 'learning'::regnamespace
    ) THEN
        ALTER TABLE learning.exercise_assignments
            ADD CONSTRAINT uq_exercise_assignments_exercise_student
            UNIQUE (exercise_id, student_id);
    END IF;
END $$;

-- =============================================================================
-- INDEXES (query patterns for labs/workshops)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users.users(role);

CREATE INDEX IF NOT EXISTS idx_student_progress_student_status
    ON learning.student_progress(student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_last_accessed
    ON learning.student_progress(student_id, last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_workshop_status
    ON learning.student_progress(workshop_id, status);

CREATE INDEX IF NOT EXISTS idx_quiz_results_student_quiz_submitted
    ON learning.quiz_results(student_id, quiz_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_passed_quiz
    ON learning.quiz_results(student_id, quiz_id)
    WHERE passed = true;
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_submitted
    ON learning.quiz_results(quiz_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_badges_student_earned_at
    ON learning.badges(student_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercises_created_active_created_at
    ON learning.exercises(created_by, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_created_workshop_active
    ON learning.exercises(created_by, workshop_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_assignments_student_due_created
    ON learning.exercise_assignments(student_id, due_date, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_exercise_status_submitted
    ON learning.exercise_assignments(exercise_id, status, submitted_at DESC);

-- =============================================================================
-- LEADERBOARD VIEW FIX
-- Avoid cartesian multiplication between badges/progress/quiz joins.
-- =============================================================================
DROP VIEW IF EXISTS learning.leaderboard;
CREATE OR REPLACE VIEW learning.leaderboard AS
SELECT
    u.id as student_id,
    u.username,
    u.first_name,
    u.last_name,
    COALESCE(b.total_xp, 0) as total_xp,
    COALESCE(b.badge_count, 0) as badge_count,
    COALESCE(sp.workshops_completed, 0) as workshops_completed,
    COALESCE(qr.quizzes_passed, 0) as quizzes_passed
FROM users.users u
LEFT JOIN (
    SELECT
        student_id,
        SUM(xp_awarded)::integer as total_xp,
        COUNT(*)::integer as badge_count
    FROM learning.badges
    GROUP BY student_id
) b ON b.student_id = u.id
LEFT JOIN (
    SELECT
        student_id,
        COUNT(DISTINCT workshop_id)::integer as workshops_completed
    FROM learning.student_progress
    WHERE status = 'COMPLETED'
    GROUP BY student_id
) sp ON sp.student_id = u.id
LEFT JOIN (
    SELECT
        student_id,
        COUNT(DISTINCT quiz_id)::integer as quizzes_passed
    FROM learning.quiz_results
    WHERE passed = true
    GROUP BY student_id
) qr ON qr.student_id = u.id
WHERE u.role = 'ROLE_ETUDIANT'
ORDER BY total_xp DESC, workshops_completed DESC;
