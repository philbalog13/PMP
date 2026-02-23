-- Migration 043: Exercise auto-correction support
-- Adds expected_keywords (for keyword-matching feedback) and sample_solution to cursus_exercises.

ALTER TABLE learning.cursus_exercises
    ADD COLUMN IF NOT EXISTS expected_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS sample_solution TEXT;

CREATE TABLE IF NOT EXISTS learning.cursus_exercise_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES learning.cursus_exercises(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    matched_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_attempts_student ON learning.cursus_exercise_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_exercise ON learning.cursus_exercise_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_student_exercise
    ON learning.cursus_exercise_attempts(student_id, exercise_id);
