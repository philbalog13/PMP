ALTER TABLE learning.exercises ADD COLUMN IF NOT EXISTS workshop_id VARCHAR(50);
ALTER TABLE learning.exercises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE learning.exercises ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;
ALTER TABLE learning.exercises ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 100;
ALTER TABLE learning.exercises ADD COLUMN IF NOT EXISTS solution JSONB;
ALTER TABLE learning.exercises ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Fix assignments as well just in case
ALTER TABLE learning.exercise_assignments ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users.users(id);
ALTER TABLE learning.exercise_assignments ADD COLUMN IF NOT EXISTS submission JSONB;
ALTER TABLE learning.exercise_assignments ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP;
