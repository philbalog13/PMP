-- Migration 010: Cursus (Learning Paths) System
-- Full course management with modules, chapters, quizzes, exercises and progress tracking.
-- Designed for CRUD by formateurs via future dashboard.

-- =============================================================================
-- 1. CURSUS (top-level learning path)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.cursus (
    id VARCHAR(80) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'book-open',
    color VARCHAR(30) DEFAULT 'emerald',
    level VARCHAR(20) NOT NULL DEFAULT 'DEBUTANT'
        CHECK (level IN ('DEBUTANT','INTERMEDIAIRE','AVANCE','EXPERT')),
    estimated_hours INTEGER NOT NULL DEFAULT 1 CHECK (estimated_hours > 0),
    prerequisites TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users.users(id) ON DELETE SET NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    module_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cursus_published ON learning.cursus(is_published);
CREATE INDEX IF NOT EXISTS idx_cursus_level ON learning.cursus(level);

-- =============================================================================
-- 2. CURSUS MODULES
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.cursus_modules (
    id VARCHAR(80) PRIMARY KEY,
    cursus_id VARCHAR(80) NOT NULL REFERENCES learning.cursus(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_order INTEGER NOT NULL CHECK (module_order > 0),
    estimated_minutes INTEGER DEFAULT 60,
    difficulty VARCHAR(10) DEFAULT '1',
    chapter_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (cursus_id, module_order)
);

CREATE INDEX IF NOT EXISTS idx_cursus_modules_cursus ON learning.cursus_modules(cursus_id, module_order);

-- =============================================================================
-- 3. CURSUS CHAPTERS (theory content)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.cursus_chapters (
    id VARCHAR(120) PRIMARY KEY,
    module_id VARCHAR(80) NOT NULL REFERENCES learning.cursus_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    key_points JSONB DEFAULT '[]',
    chapter_order INTEGER NOT NULL CHECK (chapter_order > 0),
    estimated_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (module_id, chapter_order)
);

CREATE INDEX IF NOT EXISTS idx_cursus_chapters_module ON learning.cursus_chapters(module_id, chapter_order);

-- =============================================================================
-- 4. CURSUS QUIZZES
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.cursus_quizzes (
    id VARCHAR(80) PRIMARY KEY,
    cursus_id VARCHAR(80) NOT NULL REFERENCES learning.cursus(id) ON DELETE CASCADE,
    module_id VARCHAR(80) REFERENCES learning.cursus_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    pass_percentage INTEGER NOT NULL DEFAULT 80 CHECK (pass_percentage >= 1 AND pass_percentage <= 100),
    time_limit_minutes INTEGER,
    is_final_evaluation BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cursus_quizzes_cursus ON learning.cursus_quizzes(cursus_id);
CREATE INDEX IF NOT EXISTS idx_cursus_quizzes_module ON learning.cursus_quizzes(module_id);

-- =============================================================================
-- 5. CURSUS QUIZ QUESTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.cursus_quiz_questions (
    id VARCHAR(120) PRIMARY KEY,
    quiz_id VARCHAR(80) NOT NULL REFERENCES learning.cursus_quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0),
    explanation TEXT,
    question_order INTEGER NOT NULL DEFAULT 1 CHECK (question_order > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (quiz_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_cursus_quiz_questions_quiz ON learning.cursus_quiz_questions(quiz_id, question_order);

-- =============================================================================
-- 6. CURSUS EXERCISES
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.cursus_exercises (
    id VARCHAR(120) PRIMARY KEY,
    module_id VARCHAR(80) NOT NULL REFERENCES learning.cursus_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(30) DEFAULT 'PRATIQUE'
        CHECK (type IN ('PRATIQUE','SIMULATION','ANALYSE','CAS_ETUDE')),
    description TEXT,
    instructions JSONB DEFAULT '[]',
    hints JSONB DEFAULT '[]',
    estimated_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cursus_exercises_module ON learning.cursus_exercises(module_id);

-- =============================================================================
-- 7. CURSUS STUDENT PROGRESS
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.cursus_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    cursus_id VARCHAR(80) NOT NULL REFERENCES learning.cursus(id) ON DELETE CASCADE,
    module_id VARCHAR(80),
    chapter_id VARCHAR(120),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED','IN_PROGRESS')),
    completed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (student_id, cursus_id, module_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_cursus_progress_student ON learning.cursus_progress(student_id, cursus_id);

-- =============================================================================
-- 8. CURSUS QUIZ RESULTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.cursus_quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    quiz_id VARCHAR(80) NOT NULL REFERENCES learning.cursus_quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0),
    max_score INTEGER NOT NULL CHECK (max_score > 0),
    percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    passed BOOLEAN NOT NULL,
    answers JSONB,
    time_taken_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cursus_quiz_results_student ON learning.cursus_quiz_results(student_id, quiz_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS update_cursus_updated_at ON learning.cursus;
CREATE TRIGGER update_cursus_updated_at
    BEFORE UPDATE ON learning.cursus
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cursus_modules_updated_at ON learning.cursus_modules;
CREATE TRIGGER update_cursus_modules_updated_at
    BEFORE UPDATE ON learning.cursus_modules
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cursus_chapters_updated_at ON learning.cursus_chapters;
CREATE TRIGGER update_cursus_chapters_updated_at
    BEFORE UPDATE ON learning.cursus_chapters
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();
