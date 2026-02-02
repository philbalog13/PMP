-- Migration 001: Learning Schema for PMP
-- Tables for student progress, quizzes, badges, and exercises

-- Create learning schema if not exists
CREATE SCHEMA IF NOT EXISTS learning;

-- =============================================================================
-- STUDENT PROGRESS TABLE
-- Tracks student progress through workshops
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    workshop_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    current_section INTEGER DEFAULT 0,
    total_sections INTEGER DEFAULT 1,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent_minutes INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, workshop_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON learning.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_workshop_id ON learning.student_progress(workshop_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_status ON learning.student_progress(status);

-- =============================================================================
-- QUIZ RESULTS TABLE
-- Stores quiz submission results
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    quiz_id VARCHAR(50) NOT NULL,
    workshop_id VARCHAR(50),
    score INTEGER NOT NULL CHECK (score >= 0),
    max_score INTEGER NOT NULL CHECK (max_score > 0),
    percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    passed BOOLEAN NOT NULL,
    answers JSONB,
    submitted_at TIMESTAMP DEFAULT NOW(),
    time_taken_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for quiz lookups
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_id ON learning.quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON learning.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_submitted_at ON learning.quiz_results(submitted_at);

-- =============================================================================
-- BADGES TABLE
-- Achievement system for students
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    badge_description TEXT,
    badge_icon VARCHAR(50),
    xp_awarded INTEGER DEFAULT 0,
    earned_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    UNIQUE(student_id, badge_type)
);

-- Index for badge lookups
CREATE INDEX IF NOT EXISTS idx_badges_student_id ON learning.badges(student_id);
CREATE INDEX IF NOT EXISTS idx_badges_badge_type ON learning.badges(badge_type);

-- =============================================================================
-- EXERCISES TABLE
-- Exercises created by trainers
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users.users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('QUIZ', 'PRACTICAL', 'SIMULATION', 'CODE_REVIEW', 'CASE_STUDY')),
    difficulty VARCHAR(20) CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    workshop_id VARCHAR(50),
    points INTEGER DEFAULT 100,
    time_limit_minutes INTEGER,
    content JSONB,
    solution JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for exercise lookups
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON learning.exercises(created_by);
CREATE INDEX IF NOT EXISTS idx_exercises_workshop_id ON learning.exercises(workshop_id);
CREATE INDEX IF NOT EXISTS idx_exercises_type ON learning.exercises(type);
CREATE INDEX IF NOT EXISTS idx_exercises_is_active ON learning.exercises(is_active);

-- =============================================================================
-- EXERCISE ASSIGNMENTS TABLE
-- Links exercises to students/groups
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.exercise_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES learning.exercises(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users.users(id),
    due_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED')),
    submission JSONB,
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP,
    graded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for assignment lookups
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_student_id ON learning.exercise_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_exercise_assignments_exercise_id ON learning.exercise_assignments(exercise_id);

-- =============================================================================
-- ANNOUNCEMENTS TABLE
-- Trainer announcements for students
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users.users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    target_role VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for announcement lookups
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON learning.announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON learning.announcements(is_active);

-- =============================================================================
-- LEADERBOARD VIEW
-- Aggregated view for student rankings
-- =============================================================================
CREATE OR REPLACE VIEW learning.leaderboard AS
SELECT
    u.id as student_id,
    u.username,
    u.first_name,
    u.last_name,
    COALESCE(SUM(b.xp_awarded), 0) as total_xp,
    COUNT(DISTINCT b.id) as badge_count,
    COUNT(DISTINCT CASE WHEN sp.status = 'COMPLETED' THEN sp.workshop_id END) as workshops_completed,
    COUNT(DISTINCT CASE WHEN qr.passed = true THEN qr.quiz_id END) as quizzes_passed
FROM users.users u
LEFT JOIN learning.badges b ON u.id = b.student_id
LEFT JOIN learning.student_progress sp ON u.id = sp.student_id
LEFT JOIN learning.quiz_results qr ON u.id = qr.student_id
WHERE u.role = 'ROLE_ETUDIANT'
GROUP BY u.id, u.username, u.first_name, u.last_name
ORDER BY total_xp DESC;

-- =============================================================================
-- TRIGGER: Update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION learning.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_student_progress_updated_at ON learning.student_progress;
CREATE TRIGGER update_student_progress_updated_at
    BEFORE UPDATE ON learning.student_progress
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercises_updated_at ON learning.exercises;
CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON learning.exercises
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON learning.announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON learning.announcements
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

-- =============================================================================
-- SEED DATA: Default badges
-- =============================================================================
INSERT INTO learning.badges (student_id, badge_type, badge_name, badge_description, badge_icon, xp_awarded)
SELECT
    (SELECT id FROM users.users WHERE role = 'ROLE_ETUDIANT' LIMIT 1),
    'FIRST_LOGIN',
    'Bienvenue !',
    'Premier connexion à la plateforme',
    'star',
    10
WHERE NOT EXISTS (SELECT 1 FROM learning.badges WHERE badge_type = 'FIRST_LOGIN')
AND EXISTS (SELECT 1 FROM users.users WHERE role = 'ROLE_ETUDIANT');
