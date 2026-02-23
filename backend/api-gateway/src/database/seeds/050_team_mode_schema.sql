-- =================================================================
-- Phase 8 : Team Mode & Competition Schema
-- =================================================================

-- Teams table
CREATE TABLE IF NOT EXISTS learning.ctf_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL UNIQUE,
    captain_id UUID NOT NULL,
    avatar_emoji VARCHAR(10) DEFAULT '🏴‍☠️',
    max_members INT DEFAULT 4,
    is_active BOOLEAN DEFAULT true,
    total_points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS learning.ctf_team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES learning.ctf_teams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    role VARCHAR(20) DEFAULT 'MEMBER', -- CAPTAIN, MEMBER
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, student_id)
);

-- CTF Events (time-limited competitions)
CREATE TABLE IF NOT EXISTS learning.ctf_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_name VARCHAR(200) NOT NULL,
    event_description TEXT,
    event_type VARCHAR(50) DEFAULT 'STANDARD', -- STANDARD, SPEED_RUN, KING_OF_HILL
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    max_teams INT DEFAULT 50,
    challenge_codes JSONB DEFAULT '[]'::jsonb, -- list of challenge codes included
    is_active BOOLEAN DEFAULT true,
    prizes JSONB DEFAULT '{"first": "🥇 Légende Badge", "second": "🥈 Elite Badge", "third": "🥉 Hunter Badge"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event registrations
CREATE TABLE IF NOT EXISTS learning.ctf_event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES learning.ctf_events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES learning.ctf_teams(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    total_points INT DEFAULT 0,
    challenges_solved INT DEFAULT 0,
    rank INT DEFAULT 0,
    UNIQUE(event_id, team_id)
);

-- Leaderboard by promotion/cohort
CREATE TABLE IF NOT EXISTS learning.ctf_leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,
    promotion VARCHAR(50), -- e.g. '2025-2026'
    total_points INT DEFAULT 0,
    challenges_solved INT DEFAULT 0,
    badges_earned INT DEFAULT 0,
    rank_name VARCHAR(50) DEFAULT 'Script Kiddy',
    current_streak INT DEFAULT 0,
    best_streak INT DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ctf_team_members_student ON learning.ctf_team_members(student_id);
CREATE INDEX IF NOT EXISTS idx_ctf_team_members_team ON learning.ctf_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_ctf_event_regs_event ON learning.ctf_event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_ctf_leaderboard_points ON learning.ctf_leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_ctf_leaderboard_promo ON learning.ctf_leaderboard(promotion);
