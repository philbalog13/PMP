/**
 * CTF Team & Competition Service
 * Manages teams, events, leaderboards, and streaks
 */
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { getRank } from './ctfEvaluation.service';

// ─── Teams ──────────────────────────────────────────────────────
export async function createTeam(captainId: string, teamName: string, avatarEmoji = '🏴‍☠️') {
    const result = await query(
        `INSERT INTO learning.ctf_teams (team_name, captain_id, avatar_emoji)
         VALUES ($1, $2, $3) RETURNING *`,
        [teamName, captainId, avatarEmoji]
    );
    // Auto-add captain as member
    await query(
        `INSERT INTO learning.ctf_team_members (team_id, student_id, role) VALUES ($1, $2, 'CAPTAIN')`,
        [result.rows[0].id, captainId]
    );
    logger.info('Team created', { teamId: result.rows[0].id, captain: captainId, name: teamName });
    return result.rows[0];
}

export async function joinTeam(teamId: string, studentId: string) {
    const team = await query('SELECT * FROM learning.ctf_teams WHERE id = $1 AND is_active = true', [teamId]);
    if (team.rows.length === 0) throw new Error('Team not found');

    const members = await query('SELECT COUNT(*) FROM learning.ctf_team_members WHERE team_id = $1', [teamId]);
    if (parseInt(members.rows[0].count) >= team.rows[0].max_members) throw new Error('Team is full');

    await query(
        `INSERT INTO learning.ctf_team_members (team_id, student_id, role) VALUES ($1, $2, 'MEMBER')`,
        [teamId, studentId]
    );
    return { joined: true, teamId };
}

export async function leaveTeam(teamId: string, studentId: string) {
    await query(
        'DELETE FROM learning.ctf_team_members WHERE team_id = $1 AND student_id = $2 AND role != $3',
        [teamId, studentId, 'CAPTAIN']
    );
    return { left: true };
}

export async function getTeam(teamId: string) {
    const team = await query('SELECT * FROM learning.ctf_teams WHERE id = $1', [teamId]);
    if (team.rows.length === 0) return null;
    const members = await query(
        `SELECT tm.*, u.first_name, u.last_name FROM learning.ctf_team_members tm
         LEFT JOIN users u ON tm.student_id = u.id WHERE tm.team_id = $1 ORDER BY tm.role, tm.joined_at`,
        [teamId]
    );
    return { ...team.rows[0], members: members.rows };
}

export async function listTeams(limit = 20, offset = 0) {
    const result = await query(
        `SELECT t.*, COUNT(m.id) as member_count
         FROM learning.ctf_teams t
         LEFT JOIN learning.ctf_team_members m ON m.team_id = t.id
         WHERE t.is_active = true
         GROUP BY t.id ORDER BY t.total_points DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows;
}

// ─── CTF Events ─────────────────────────────────────────────────
export async function createEvent(eventData: {
    name: string; description?: string; type?: string;
    startTime: string; endTime: string; maxTeams?: number; challengeCodes?: string[];
}) {
    const result = await query(
        `INSERT INTO learning.ctf_events (event_name, event_description, event_type, start_time, end_time, max_teams, challenge_codes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [eventData.name, eventData.description || '', eventData.type || 'STANDARD',
        eventData.startTime, eventData.endTime, eventData.maxTeams || 50,
        JSON.stringify(eventData.challengeCodes || [])]
    );
    logger.info('CTF event created', { eventId: result.rows[0].id, name: eventData.name });
    return result.rows[0];
}

export async function registerTeamForEvent(eventId: string, teamId: string) {
    const event = await query('SELECT * FROM learning.ctf_events WHERE id = $1 AND is_active = true', [eventId]);
    if (event.rows.length === 0) throw new Error('Event not found');
    if (new Date() > new Date(event.rows[0].end_time)) throw new Error('Event has ended');

    const registrations = await query('SELECT COUNT(*) FROM learning.ctf_event_registrations WHERE event_id = $1', [eventId]);
    if (parseInt(registrations.rows[0].count) >= event.rows[0].max_teams) throw new Error('Event is full');

    await query(
        'INSERT INTO learning.ctf_event_registrations (event_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [eventId, teamId]
    );
    return { registered: true };
}

export async function getEventLeaderboard(eventId: string) {
    const result = await query(
        `SELECT er.*, t.team_name, t.avatar_emoji
         FROM learning.ctf_event_registrations er
         JOIN learning.ctf_teams t ON er.team_id = t.id
         WHERE er.event_id = $1
         ORDER BY er.total_points DESC, er.challenges_solved DESC`,
        [eventId]
    );
    return result.rows.map((row: any, idx: number) => ({ ...row, rank: idx + 1 }));
}

export async function listActiveEvents() {
    const result = await query(
        `SELECT * FROM learning.ctf_events WHERE is_active = true AND end_time > NOW() ORDER BY start_time ASC`
    );
    return result.rows;
}

// ─── Leaderboard ────────────────────────────────────────────────
export async function getLeaderboard(promotion?: string, limit = 50) {
    const whereClause = promotion ? 'WHERE lb.promotion = $2' : '';
    const params: any[] = [limit];
    if (promotion) params.push(promotion);

    const result = await query(
        `SELECT lb.*, u.first_name, u.last_name
         FROM learning.ctf_leaderboard lb
         LEFT JOIN users u ON lb.student_id = u.id
         ${whereClause}
         ORDER BY lb.total_points DESC LIMIT $1`,
        params
    );
    return result.rows.map((row: any, idx: number) => ({
        ...row,
        position: idx + 1,
        rank: getRank(row.total_points),
    }));
}

export async function updateLeaderboardEntry(studentId: string, pointsDelta: number) {
    await query(
        `INSERT INTO learning.ctf_leaderboard (student_id, total_points, challenges_solved, last_activity)
         VALUES ($1, $2, 1, NOW())
         ON CONFLICT (student_id) DO UPDATE SET
            total_points = learning.ctf_leaderboard.total_points + $2,
            challenges_solved = learning.ctf_leaderboard.challenges_solved + 1,
            rank_name = CASE
                WHEN learning.ctf_leaderboard.total_points + $2 >= 8000 THEN 'Légende'
                WHEN learning.ctf_leaderboard.total_points + $2 >= 5000 THEN 'Maître Monétique'
                WHEN learning.ctf_leaderboard.total_points + $2 >= 3000 THEN 'Elite Hacker'
                WHEN learning.ctf_leaderboard.total_points + $2 >= 1500 THEN 'Hunter'
                WHEN learning.ctf_leaderboard.total_points + $2 >= 500 THEN 'Padawan'
                ELSE 'Script Kiddy'
            END,
            last_activity = NOW(),
            updated_at = NOW()`,
        [studentId, pointsDelta]
    );
}

// ─── Streaks ────────────────────────────────────────────────────
export async function updateStreak(studentId: string) {
    const result = await query(
        `SELECT last_activity, current_streak, best_streak FROM learning.ctf_leaderboard WHERE student_id = $1`,
        [studentId]
    );
    if (result.rows.length === 0) return;

    const { last_activity, current_streak, best_streak } = result.rows[0];
    const lastDate = new Date(last_activity).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = current_streak;
    if (lastDate === yesterday) {
        newStreak = current_streak + 1;
    } else if (lastDate !== today) {
        newStreak = 1; // Reset streak
    }

    const newBest = Math.max(best_streak, newStreak);
    await query(
        `UPDATE learning.ctf_leaderboard SET current_streak = $1, best_streak = $2, last_activity = NOW() WHERE student_id = $3`,
        [newStreak, newBest, studentId]
    );
    return { currentStreak: newStreak, bestStreak: newBest };
}
