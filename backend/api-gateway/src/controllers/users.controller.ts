/**
 * Users Controller - PMP
 * CRUD operations for user management
 */
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { config } from '../config';
import { UserRole } from '../middleware/roles';
import { provisionFinancialAccountForUser } from '../services/bankingProvisioning.service';

/**
 * Get all users (with pagination)
 */
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const role = req.query.role as string;
        const status = req.query.status as string;
        const search = req.query.search as string;

        let whereConditions = ['1=1'];
        let params: any[] = [];
        let paramIndex = 1;

        if (role) {
            whereConditions.push(`role = $${paramIndex}`);
            params.push(role);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereConditions.push(`(username ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Count total
        const countResult = await query(
            `SELECT COUNT(*) FROM users.users WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Get users
        const result = await query(
            `SELECT id, username, email, first_name, last_name, role, status, created_at, updated_at
             FROM users.users
             WHERE ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            users: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        logger.error('Get all users error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
};

/**
 * Get all students
 */
export const getStudents = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const countResult = await query(
            `SELECT COUNT(*) FROM users.users WHERE role = 'ROLE_ETUDIANT'`
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await query(
            `SELECT
                u.id, u.username, u.email, u.first_name, u.last_name, u.status, u.created_at,
                COALESCE(
                    (SELECT COUNT(*) FROM learning.student_progress sp WHERE sp.student_id = u.id AND sp.status = 'COMPLETED'),
                    0
                ) as workshops_completed,
                COALESCE(
                    (SELECT SUM(xp_awarded) FROM learning.badges b WHERE b.student_id = u.id),
                    0
                ) as total_xp,
                COALESCE(
                    (SELECT COUNT(*) FROM learning.badges b WHERE b.student_id = u.id),
                    0
                ) as badge_count
             FROM users.users u
             WHERE u.role = 'ROLE_ETUDIANT'
             ORDER BY u.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            success: true,
            students: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        logger.error('Get students error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch students' });
    }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT id, username, email, first_name, last_name, role, status, created_at, updated_at
             FROM users.users WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = result.rows[0];

        // If student, get additional data
        if (user.role === 'ROLE_ETUDIANT') {
            const progressResult = await query(
                `SELECT workshop_id, status, progress_percent, time_spent_minutes
                 FROM learning.student_progress WHERE student_id = $1`,
                [id]
            );

            const badgesResult = await query(
                `SELECT badge_type, badge_name, badge_icon, xp_awarded, earned_at
                 FROM learning.badges WHERE student_id = $1`,
                [id]
            );

            const quizResult = await query(
                `SELECT quiz_id, score, max_score, percentage, passed, submitted_at
                 FROM learning.quiz_results WHERE student_id = $1
                 ORDER BY submitted_at DESC LIMIT 10`,
                [id]
            );

            user.progress = progressResult.rows;
            user.badges = badgesResult.rows;
            user.recentQuizzes = quizResult.rows;
        }

        res.json({ success: true, user });
    } catch (error: any) {
        logger.error('Get user by ID error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
};

/**
 * Create new user
 */
export const createUser = async (req: Request, res: Response) => {
    try {
        const { username, email, password, firstName, lastName, role, groupName } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Check if user exists
        const check = await query(
            'SELECT 1 FROM users.users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if ((check.rowCount ?? 0) > 0) {
            return res.status(409).json({ success: false, error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
        const passwordHash = await bcrypt.hash(password, salt);

        // Validate role
        const validRoles = [UserRole.ETUDIANT, UserRole.CLIENT, UserRole.MARCHAND, UserRole.FORMATEUR];
        const userRole = validRoles.includes(role) ? role : UserRole.ETUDIANT;
        const normalizedGroupName = typeof groupName === 'string' && groupName.trim() !== ''
            ? groupName.trim()
            : null;

        let result;
        try {
            result = await query(
                `INSERT INTO users.users (username, email, password_hash, first_name, last_name, role, status, group_name)
                 VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7)
                 RETURNING id, username, email, first_name, last_name, role, status, group_name, created_at`,
                [username, email, passwordHash, firstName, lastName, userRole, normalizedGroupName]
            );
        } catch (insertError: any) {
            // Backward compatibility if DB column is not yet migrated.
            if (insertError.code !== '42703') {
                throw insertError;
            }

            logger.warn('users.users.group_name column missing, creating user without groupName', {
                username,
                email
            });

            result = await query(
                `INSERT INTO users.users (username, email, password_hash, first_name, last_name, role, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
                 RETURNING id, username, email, first_name, last_name, role, status, created_at`,
                [username, email, passwordHash, firstName, lastName, userRole]
            );
        }

        try {
            await provisionFinancialAccountForUser(result.rows[0].id, result.rows[0].role);
        } catch (provisionError: any) {
            await query(`DELETE FROM users.users WHERE id = $1`, [result.rows[0].id]);
            throw provisionError;
        }

        logger.info('User created by trainer', {
            createdBy: (req as any).user?.userId,
            newUser: result.rows[0].id,
            role: userRole
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Create user error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { username, email, firstName, lastName, role } = req.body;

        // Build update query dynamically
        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (username) {
            updates.push(`username = $${paramIndex}`);
            params.push(username);
            paramIndex++;
        }
        if (email) {
            updates.push(`email = $${paramIndex}`);
            params.push(email);
            paramIndex++;
        }
        if (firstName) {
            updates.push(`first_name = $${paramIndex}`);
            params.push(firstName);
            paramIndex++;
        }
        if (lastName) {
            updates.push(`last_name = $${paramIndex}`);
            params.push(lastName);
            paramIndex++;
        }
        if (role) {
            const validRoles = ['ROLE_ETUDIANT', 'ROLE_CLIENT', 'ROLE_MARCHAND', 'ROLE_FORMATEUR'];
            if (validRoles.includes(role)) {
                updates.push(`role = $${paramIndex}`);
                params.push(role);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        params.push(id);

        const result = await query(
            `UPDATE users.users SET ${updates.join(', ')} WHERE id = $${paramIndex}
             RETURNING id, username, email, first_name, last_name, role, status, updated_at`,
            params
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            user: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Update user error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
};

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if ((req as any).user?.userId === id) {
            return res.status(403).json({ success: false, error: 'Cannot delete yourself' });
        }

        const result = await query(
            'DELETE FROM users.users WHERE id = $1 RETURNING id, username',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        logger.info('User deleted', {
            deletedBy: (req as any).user?.userId,
            deletedUser: id
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error: any) {
        logger.error('Delete user error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
};

/**
 * Update user status (activate/deactivate)
 */
export const updateUserStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        // Prevent self-deactivation
        if ((req as any).user?.userId === id && status !== 'ACTIVE') {
            return res.status(403).json({ success: false, error: 'Cannot deactivate yourself' });
        }

        const result = await query(
            `UPDATE users.users SET status = $1, updated_at = NOW() WHERE id = $2
             RETURNING id, username, email, status`,
            [status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            message: `User ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
            user: result.rows[0]
        });
    } catch (error: any) {
        logger.error('Update user status error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
};

/**
 * Get student progress (detailed)
 */
export const getStudentProgress = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get student info
        const userResult = await query(
            'SELECT id, username, email, first_name, last_name, role FROM users.users WHERE id = $1',
            [id]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        if (userResult.rows[0].role !== 'ROLE_ETUDIANT') {
            return res.status(400).json({ success: false, error: 'User is not a student' });
        }

        // Get workshop progress
        const progressResult = await query(
            `SELECT workshop_id, status, progress_percent, current_section, total_sections,
                    started_at, completed_at, time_spent_minutes, last_accessed_at
             FROM learning.student_progress WHERE student_id = $1
             ORDER BY last_accessed_at DESC NULLS LAST`,
            [id]
        );

        // Get quiz results
        const quizResult = await query(
            `SELECT quiz_id, workshop_id, score, max_score, percentage, passed,
                    submitted_at, time_taken_seconds, attempt_number
             FROM learning.quiz_results WHERE student_id = $1
             ORDER BY submitted_at DESC`,
            [id]
        );

        // Get badges
        const badgesResult = await query(
            `SELECT badge_type, badge_name, badge_description, badge_icon, xp_awarded, earned_at
             FROM learning.badges WHERE student_id = $1
             ORDER BY earned_at DESC`,
            [id]
        );

        // Get exercise assignments
        const exercisesResult = await query(
            `SELECT ea.id, e.title, e.type, e.difficulty, e.points,
                    ea.status, ea.due_date, ea.grade, ea.submitted_at
             FROM learning.exercise_assignments ea
             JOIN learning.exercises e ON ea.exercise_id = e.id
             WHERE ea.student_id = $1
             ORDER BY ea.due_date DESC NULLS LAST`,
            [id]
        );

        // Calculate stats
        const totalXP = badgesResult.rows.reduce((sum, b) => sum + (b.xp_awarded || 0), 0);
        const workshopsCompleted = progressResult.rows.filter(p => p.status === 'COMPLETED').length;
        const quizzesPassed = quizResult.rows.filter(q => q.passed).length;
        const avgQuizScore = quizResult.rows.length > 0
            ? quizResult.rows.reduce((sum, q) => sum + q.percentage, 0) / quizResult.rows.length
            : 0;

        res.json({
            success: true,
            student: userResult.rows[0],
            stats: {
                totalXP,
                workshopsCompleted,
                quizzesPassed,
                totalQuizzes: quizResult.rows.length,
                avgQuizScore: Math.round(avgQuizScore),
                badgeCount: badgesResult.rows.length,
                exercisesAssigned: exercisesResult.rows.length
            },
            progress: progressResult.rows,
            quizzes: quizResult.rows,
            badges: badgesResult.rows,
            exercises: exercisesResult.rows
        });
    } catch (error: any) {
        logger.error('Get student progress error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch student progress' });
    }
};
