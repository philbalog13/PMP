/**
 * CTF Team & Competition Controller
 * REST endpoints for team mode, events, and leaderboards
 */
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import * as teamService from '../services/ctfTeam.service';

// ─── Teams ──────────────────────────────────────────────────────
export const createTeam = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { teamName, avatarEmoji } = req.body;
        if (!teamName) return res.status(400).json({ success: false, error: 'teamName is required' });
        const team = await teamService.createTeam(userId, teamName, avatarEmoji);
        res.status(201).json({ success: true, team });
    } catch (error: any) {
        logger.error('Create team error', { error: error.message });
        res.status(error.message?.includes('unique') ? 409 : 500).json({ success: false, error: error.message || 'Failed to create team' });
    }
};

export const joinTeam = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { teamId } = req.params;
        const result = await teamService.joinTeam(teamId, userId);
        res.json({ success: true, ...result });
    } catch (error: any) {
        logger.error('Join team error', { error: error.message });
        res.status(400).json({ success: false, error: error.message || 'Failed to join team' });
    }
};

export const leaveTeam = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { teamId } = req.params;
        const result = await teamService.leaveTeam(teamId, userId);
        res.json({ success: true, ...result });
    } catch (error: any) {
        logger.error('Leave team error', { error: error.message });
        res.status(400).json({ success: false, error: error.message || 'Failed to leave team' });
    }
};

export const getTeam = async (req: Request, res: Response) => {
    try {
        const team = await teamService.getTeam(req.params.teamId);
        if (!team) return res.status(404).json({ success: false, error: 'Team not found' });
        res.json({ success: true, team });
    } catch (error: any) {
        logger.error('Get team error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch team' });
    }
};

export const listTeams = async (_req: Request, res: Response) => {
    try {
        const teams = await teamService.listTeams();
        res.json({ success: true, teams });
    } catch (error: any) {
        logger.error('List teams error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to list teams' });
    }
};

// ─── Events ─────────────────────────────────────────────────────
export const createEvent = async (req: Request, res: Response) => {
    try {
        const { name, description, type, startTime, endTime, maxTeams, challengeCodes } = req.body;
        if (!name || !startTime || !endTime) return res.status(400).json({ success: false, error: 'name, startTime, endTime required' });
        const event = await teamService.createEvent({ name, description, type, startTime, endTime, maxTeams, challengeCodes });
        res.status(201).json({ success: true, event });
    } catch (error: any) {
        logger.error('Create event error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create event' });
    }
};

export const registerForEvent = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { teamId } = req.body;
        const result = await teamService.registerTeamForEvent(eventId, teamId);
        res.json({ success: true, ...result });
    } catch (error: any) {
        logger.error('Register for event error', { error: error.message });
        res.status(400).json({ success: false, error: error.message || 'Failed to register' });
    }
};

export const getEventLeaderboard = async (req: Request, res: Response) => {
    try {
        const leaderboard = await teamService.getEventLeaderboard(req.params.eventId);
        res.json({ success: true, leaderboard });
    } catch (error: any) {
        logger.error('Event leaderboard error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
};

export const listEvents = async (_req: Request, res: Response) => {
    try {
        const events = await teamService.listActiveEvents();
        res.json({ success: true, events });
    } catch (error: any) {
        logger.error('List events error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to list events' });
    }
};

// ─── Leaderboard ────────────────────────────────────────────────
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const promotion = req.query.promotion as string | undefined;
        const leaderboard = await teamService.getLeaderboard(promotion);
        res.json({ success: true, leaderboard });
    } catch (error: any) {
        logger.error('Leaderboard error', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }
};
