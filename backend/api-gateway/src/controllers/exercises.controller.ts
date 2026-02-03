/**
 * Exercises Controller - PMP
 * Exercise management for trainers and students
 */
import { Request, Response } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const LEGACY_WORKSHOP_IDS = new Set([
    'intro',
    'iso8583',
    'hsm-keys',
    '3ds-flow',
    'fraud-detection',
    'emv'
]);

async function isValidWorkshopId(workshopId: string): Promise<boolean> {
    try {
        const result = await query(
            `SELECT 1
             FROM learning.workshops
             WHERE id = $1 AND is_active = true
             LIMIT 1`,
            [workshopId]
        );
        if ((result.rowCount ?? 0) > 0) {
            return true;
        }
    } catch (error: any) {
        logger.warn('Learning workshop catalog unavailable in exercises controller, using fallback validation', {
            workshopId,
            error: error.message
        });
    }

    return LEGACY_WORKSHOP_IDS.has(workshopId);
}

/**
 * Get exercises (role-based)
 */
export const getExercises = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?.userId;
        const role = user?.role;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const type = req.query.type as string;
        const difficulty = req.query.difficulty as string;
        const workshopId = req.query.workshopId as string;

        if (role === 'ROLE_FORMATEUR') {
            // Trainer sees exercises they created
            let whereConditions = ['created_by = $1', 'is_active = true'];
            let params: any[] = [userId];
            let paramIndex = 2;

            if (type) {
                whereConditions.push(`type = $${paramIndex}`);
                params.push(type);
                paramIndex++;
            }
            if (difficulty) {
                whereConditions.push(`difficulty = $${paramIndex}`);
                params.push(difficulty);
                paramIndex++;
            }
            if (workshopId) {
                whereConditions.push(`workshop_id = $${paramIndex}`);
                params.push(workshopId);
                paramIndex++;
            }

            const countResult = await query(
                `SELECT COUNT(*) FROM learning.exercises WHERE ${whereConditions.join(' AND ')}`,
                params
            );

            const result = await query(
                `SELECT e.id, e.title, e.description, e.type, e.difficulty, e.workshop_id, e.points,
                        e.time_limit_minutes, e.is_active, e.created_at, e.updated_at,
                        COALESCE(COUNT(ea.id), 0)::integer as assignment_count
                 FROM learning.exercises e
                 LEFT JOIN learning.exercise_assignments ea ON ea.exercise_id = e.id
                 WHERE ${whereConditions.join(' AND ')}
                 GROUP BY e.id
                 ORDER BY e.created_at DESC
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                [...params, limit, offset]
            );

            res.json({
                success: true,
                exercises: result.rows,
                pagination: {
                    page,
                    limit,
                    total: parseInt(countResult.rows[0].count),
                    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
                }
            });
        } else {
            // Student sees assigned exercises
            const result = await query(
                `SELECT e.id, e.title, e.description, e.type, e.difficulty, e.workshop_id,
                        e.points, e.time_limit_minutes,
                        ea.id as assignment_id, ea.status, ea.due_date, ea.grade, ea.feedback,
                        ea.submitted_at, ea.graded_at
                 FROM learning.exercise_assignments ea
                 JOIN learning.exercises e ON ea.exercise_id = e.id
                 WHERE ea.student_id = $1 AND e.is_active = true
                 ORDER BY ea.due_date ASC NULLS LAST, ea.created_at DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            );

            res.json({
                success: true,
                exercises: result.rows
            });
        }
    } catch (error: any) {
        logger.error('Get exercises error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch exercises' });
    }
};

/**
 * Get exercise by ID
 */
export const getExerciseById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const userId = user?.userId;
        const role = user?.role;

        const result = await query(
            `SELECT e.*, u.username as created_by_username
             FROM learning.exercises e
             JOIN users.users u ON e.created_by = u.id
             WHERE e.id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }

        const exercise = result.rows[0];

        // Students can only see exercises assigned to them
        if (role === 'ROLE_ETUDIANT') {
            const assignment = await query(
                `SELECT id, status, due_date, submission, grade, feedback
                 FROM learning.exercise_assignments
                 WHERE exercise_id = $1 AND student_id = $2`,
                [id, userId]
            );

            if (assignment.rowCount === 0) {
                return res.status(403).json({ success: false, error: 'Exercise not assigned to you' });
            }

            // Don't show solution to students
            delete exercise.solution;
            exercise.assignment = assignment.rows[0];
        }

        res.json({ success: true, exercise });
    } catch (error: any) {
        logger.error('Get exercise by ID error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch exercise' });
    }
};

/**
 * Create exercise (Formateur only)
 */
export const createExercise = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const {
            title, description, type, difficulty, workshopId,
            points, timeLimitMinutes, content, solution
        } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        // Validate enums
        const validTypes = ['QUIZ', 'PRACTICAL', 'SIMULATION', 'CODE_REVIEW', 'CASE_STUDY'];
        const validDifficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

        if (type && !validTypes.includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid exercise type' });
        }
        if (difficulty && !validDifficulties.includes(difficulty)) {
            return res.status(400).json({ success: false, error: 'Invalid difficulty level' });
        }

        if (workshopId !== undefined && workshopId !== null) {
            if (typeof workshopId !== 'string' || workshopId.trim() === '') {
                return res.status(400).json({ success: false, error: 'Invalid workshop ID' });
            }
            const workshopIsValid = await isValidWorkshopId(workshopId);
            if (!workshopIsValid) {
                return res.status(400).json({ success: false, error: 'Unknown workshop ID' });
            }
        }

        const result = await query(
            `INSERT INTO learning.exercises
             (created_by, title, description, type, difficulty, workshop_id, points, time_limit_minutes, content, solution)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, title, description, type, difficulty, workshop_id, points, time_limit_minutes, created_at`,
            [
                userId, title, description, type || 'PRACTICAL', difficulty || 'INTERMEDIATE',
                workshopId, points || 100, timeLimitMinutes,
                content ? JSON.stringify(content) : null,
                solution ? JSON.stringify(solution) : null
            ]
        );

        logger.info('Exercise created', { exerciseId: result.rows[0].id, createdBy: userId });

        res.status(201).json({
            success: true,
            message: 'Exercise created successfully',
            exercise: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Create exercise error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create exercise' });
    }
};

/**
 * Update exercise (Formateur only)
 */
export const updateExercise = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;
        const {
            title, description, type, difficulty, workshopId,
            points, timeLimitMinutes, content, solution, isActive
        } = req.body;

        // Check ownership
        const check = await query(
            'SELECT created_by FROM learning.exercises WHERE id = $1',
            [id]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }

        if (check.rows[0].created_by !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to modify this exercise' });
        }

        if (workshopId !== undefined && workshopId !== null) {
            if (typeof workshopId !== 'string' || workshopId.trim() === '') {
                return res.status(400).json({ success: false, error: 'Invalid workshop ID' });
            }
            const workshopIsValid = await isValidWorkshopId(workshopId);
            if (!workshopIsValid) {
                return res.status(400).json({ success: false, error: 'Unknown workshop ID' });
            }
        }

        // Build update query
        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        const addUpdate = (field: string, value: any) => {
            if (value !== undefined) {
                updates.push(`${field} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        };

        addUpdate('title', title);
        addUpdate('description', description);
        addUpdate('type', type);
        addUpdate('difficulty', difficulty);
        addUpdate('workshop_id', workshopId);
        addUpdate('points', points);
        addUpdate('time_limit_minutes', timeLimitMinutes);
        addUpdate('is_active', isActive);

        if (content !== undefined) {
            updates.push(`content = $${paramIndex}`);
            params.push(JSON.stringify(content));
            paramIndex++;
        }
        if (solution !== undefined) {
            updates.push(`solution = $${paramIndex}`);
            params.push(JSON.stringify(solution));
            paramIndex++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        params.push(id);

        const result = await query(
            `UPDATE learning.exercises SET ${updates.join(', ')}, updated_at = NOW()
             WHERE id = $${paramIndex}
             RETURNING id, title, description, type, difficulty, workshop_id, points, is_active, updated_at`,
            params
        );

        res.json({
            success: true,
            message: 'Exercise updated successfully',
            exercise: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Update exercise error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update exercise' });
    }
};

/**
 * Delete exercise (soft delete)
 */
export const deleteExercise = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        // Check ownership
        const check = await query(
            'SELECT created_by FROM learning.exercises WHERE id = $1',
            [id]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }

        if (check.rows[0].created_by !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to delete this exercise' });
        }

        // Soft delete
        await query(
            'UPDATE learning.exercises SET is_active = false, updated_at = NOW() WHERE id = $1',
            [id]
        );

        logger.info('Exercise deleted', { exerciseId: id, deletedBy: userId });

        res.json({
            success: true,
            message: 'Exercise deleted successfully'
        });
    } catch (error: any) {
        logger.error('Delete exercise error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to delete exercise' });
    }
};

/**
 * Assign exercise to students
 */
export const assignExercise = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;
        const { studentIds, dueDate } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Student IDs are required' });
        }

        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const uniqueStudentIds = Array.from(new Set(
            studentIds.filter(
                (studentId: unknown): studentId is string =>
                    typeof studentId === 'string' &&
                    studentId.trim() !== '' &&
                    uuidPattern.test(studentId)
            )
        ));

        if (uniqueStudentIds.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid student IDs provided' });
        }

        // Check exercise exists and ownership
        const check = await query(
            'SELECT id, created_by FROM learning.exercises WHERE id = $1 AND is_active = true',
            [id]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }

        if (check.rows[0].created_by !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to assign this exercise' });
        }

        // Bulk insert (faster + deterministic dedupe with unique constraint)
        const result = await query(
            `INSERT INTO learning.exercise_assignments (exercise_id, student_id, assigned_by, due_date)
             SELECT $1, s.student_id, $2, $3
             FROM UNNEST($4::uuid[]) AS s(student_id)
             JOIN users.users u ON u.id = s.student_id AND u.role = 'ROLE_ETUDIANT'
             ON CONFLICT (exercise_id, student_id) DO NOTHING
             RETURNING id, student_id`,
            [id, userId, dueDate || null, uniqueStudentIds]
        );

        const assignments = result.rows.map((row) => ({
            studentId: row.student_id,
            assignmentId: row.id
        }));

        logger.info('Exercise assigned', { exerciseId: id, assignedCount: assignments.length });

        res.json({
            success: true,
            message: `Exercise assigned to ${assignments.length} student(s)`,
            assignments
        });
    } catch (error: any) {
        logger.error('Assign exercise error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to assign exercise' });
    }
};

/**
 * Submit exercise (Student)
 */
export const submitExercise = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;
        const { submission } = req.body;

        if (!submission) {
            return res.status(400).json({ success: false, error: 'Submission is required' });
        }

        // Check assignment exists
        const assignment = await query(
            `SELECT ea.id, ea.status, e.time_limit_minutes
             FROM learning.exercise_assignments ea
             JOIN learning.exercises e ON ea.exercise_id = e.id
             WHERE ea.exercise_id = $1 AND ea.student_id = $2`,
            [id, userId]
        );

        if (assignment.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Exercise assignment not found' });
        }

        if (assignment.rows[0].status === 'GRADED') {
            return res.status(400).json({ success: false, error: 'Exercise already graded' });
        }

        // Update assignment
        const result = await query(
            `UPDATE learning.exercise_assignments
             SET submission = $1, status = 'SUBMITTED', submitted_at = NOW()
             WHERE id = $2
             RETURNING id, status, submitted_at`,
            [JSON.stringify(submission), assignment.rows[0].id]
        );

        res.json({
            success: true,
            message: 'Exercise submitted successfully',
            assignment: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Submit exercise error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to submit exercise' });
    }
};

/**
 * Grade exercise (Formateur)
 */
export const gradeExercise = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;
        const { assignmentId, grade, feedback } = req.body;

        if (!assignmentId) {
            return res.status(400).json({ success: false, error: 'Assignment ID is required' });
        }

        if (grade === undefined || grade < 0 || grade > 100) {
            return res.status(400).json({ success: false, error: 'Valid grade (0-100) is required' });
        }

        // Check assignment exists and exercise ownership
        const check = await query(
            `SELECT ea.id, ea.status, e.created_by
             FROM learning.exercise_assignments ea
             JOIN learning.exercises e ON ea.exercise_id = e.id
             WHERE ea.id = $1 AND ea.exercise_id = $2`,
            [assignmentId, id]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Assignment not found' });
        }

        if (check.rows[0].created_by !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to grade this exercise' });
        }

        if (check.rows[0].status !== 'SUBMITTED') {
            return res.status(400).json({ success: false, error: 'Assignment not submitted yet' });
        }

        // Update grade
        const result = await query(
            `UPDATE learning.exercise_assignments
             SET grade = $1, feedback = $2, status = 'GRADED', graded_at = NOW()
             WHERE id = $3
             RETURNING id, grade, feedback, status, graded_at`,
            [grade, feedback, assignmentId]
        );

        res.json({
            success: true,
            message: 'Exercise graded successfully',
            assignment: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Grade exercise error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to grade exercise' });
    }
};

/**
 * Get exercise submissions (Formateur)
 */
export const getSubmissions = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        // Check exercise ownership
        const check = await query(
            'SELECT created_by FROM learning.exercises WHERE id = $1',
            [id]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Exercise not found' });
        }

        if (check.rows[0].created_by !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to view submissions for this exercise' });
        }

        // Get submissions
        const result = await query(
            `SELECT ea.id, ea.student_id, ea.status, ea.due_date, ea.submission,
                    ea.grade, ea.feedback, ea.submitted_at, ea.graded_at,
                    u.username, u.first_name, u.last_name, u.email
             FROM learning.exercise_assignments ea
             JOIN users.users u ON ea.student_id = u.id
             WHERE ea.exercise_id = $1
             ORDER BY
                CASE ea.status
                    WHEN 'SUBMITTED' THEN 1
                    WHEN 'IN_PROGRESS' THEN 2
                    WHEN 'ASSIGNED' THEN 3
                    WHEN 'GRADED' THEN 4
                END,
                ea.submitted_at DESC NULLS LAST`,
            [id]
        );

        // Summary
        const summary = {
            total: result.rows.length,
            assigned: result.rows.filter(r => r.status === 'ASSIGNED').length,
            inProgress: result.rows.filter(r => r.status === 'IN_PROGRESS').length,
            submitted: result.rows.filter(r => r.status === 'SUBMITTED').length,
            graded: result.rows.filter(r => r.status === 'GRADED').length
        };

        res.json({
            success: true,
            submissions: result.rows,
            summary
        });
    } catch (error: any) {
        logger.error('Get submissions error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
    }
};
