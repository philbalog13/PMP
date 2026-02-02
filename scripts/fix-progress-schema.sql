ALTER TABLE learning.student_progress ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 0;
ALTER TABLE learning.student_progress ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT NOW();
ALTER TABLE learning.student_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Also check for attempt_number in quiz_results as seen in controller
ALTER TABLE learning.quiz_results ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- Also check badges specific columns
ALTER TABLE learning.badges ADD COLUMN IF NOT EXISTS badge_description TEXT;
ALTER TABLE learning.badges ADD COLUMN IF NOT EXISTS badge_icon VARCHAR(50);
ALTER TABLE learning.badges ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;
