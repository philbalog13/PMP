import express from 'express';
import request from 'supertest';

const getMe = jest.fn((req, res) => res.status(200).json({ route: 'me' }));
const savePreferences = jest.fn((req, res) => res.status(200).json({ route: 'me-preferences' }));
const getUserById = jest.fn((req, res) => res.status(200).json({ route: 'id', id: req.params.id }));

jest.mock('../middleware/auth.middleware', () => ({
    authMiddleware: (req: any, _res: any, next: any) => {
        req.user = { userId: 'trainer-1', role: 'ROLE_FORMATEUR' };
        next();
    }
}));

jest.mock('../middleware/roles', () => ({
    UserRole: {
        FORMATEUR: 'ROLE_FORMATEUR'
    },
    Permission: {},
    RequireRole: () => (_req: any, _res: any, next: any) => next(),
    RequirePermission: () => (_req: any, _res: any, next: any) => next()
}));

jest.mock('../controllers/auth.controller', () => ({
    getMe,
    savePreferences
}));

jest.mock('../controllers/users.controller', () => ({
    getAllUsers: jest.fn((_req, res) => res.status(200).json({ route: 'list' })),
    getStudents: jest.fn((_req, res) => res.status(200).json({ route: 'students' })),
    getUserById,
    createUser: jest.fn((_req, res) => res.status(201).json({ route: 'create' })),
    updateUser: jest.fn((_req, res) => res.status(200).json({ route: 'update' })),
    deleteUser: jest.fn((_req, res) => res.status(200).json({ route: 'delete' })),
    updateUserStatus: jest.fn((_req, res) => res.status(200).json({ route: 'status' })),
    getStudentProgress: jest.fn((_req, res) => res.status(200).json({ route: 'progress' }))
}));

import router from '../routes/users.routes';

describe('users.routes reserved paths', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/users', router);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes GET /api/users/me to authController.getMe', async () => {
        const response = await request(app).get('/api/users/me');

        expect(response.status).toBe(200);
        expect(response.body.route).toBe('me');
        expect(getMe).toHaveBeenCalledTimes(1);
        expect(getUserById).not.toHaveBeenCalled();
    });

    it('routes POST /api/users/me/preferences to authController.savePreferences', async () => {
        const response = await request(app)
            .post('/api/users/me/preferences')
            .send({ onboardingDone: true });

        expect(response.status).toBe(200);
        expect(response.body.route).toBe('me-preferences');
        expect(savePreferences).toHaveBeenCalledTimes(1);
        expect(getUserById).not.toHaveBeenCalled();
    });

    it('keeps GET /api/users/:id on the admin CRUD handler', async () => {
        const response = await request(app).get('/api/users/user-123');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ route: 'id', id: 'user-123' });
        expect(getUserById).toHaveBeenCalledTimes(1);
        expect(getMe).not.toHaveBeenCalled();
    });
});
