import { getNextStep } from '../controllers/progress.controller';
import { query } from '../config/database';

jest.mock('../config/database', () => ({
    query: jest.fn()
}));

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

type MockResponse = {
    status: jest.Mock;
    json: jest.Mock;
    statusCode: number;
    body: any;
};

function createResponse(): MockResponse {
    const res = {
        statusCode: 200,
        body: null
    } as MockResponse;

    res.status = jest.fn().mockImplementation((statusCode: number) => {
        res.statusCode = statusCode;
        return res;
    });

    res.json = jest.fn().mockImplementation((payload: any) => {
        res.body = payload;
        return res;
    });

    return res;
}

function createRequest(userId?: string) {
    return {
        user: userId ? { userId } : undefined
    } as any;
}

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('progress.controller#getNextStep', () => {
    beforeEach(() => {
        mockedQuery.mockReset();
    });

    it('returns 401 when student is not authenticated', async () => {
        const req = createRequest();
        const res = createResponse();

        await getNextStep(req as any, res as any);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.body.success).toBe(false);
        expect(mockedQuery).not.toHaveBeenCalled();
    });

    it('prioritizes resuming an in-progress module', async () => {
        const req = createRequest('student-1');
        const res = createResponse();

        mockedQuery
            .mockResolvedValueOnce({
                rowCount: 2,
                rows: [
                    {
                        module_id: 'module-1',
                        module_title: 'Module 1',
                        module_order: 1,
                        cursus_id: 'cursus-1',
                        cursus_title: 'Cursus 1',
                        completed_chapters: '2',
                        total_chapters: '5'
                    },
                    {
                        module_id: 'module-2',
                        module_title: 'Module 2',
                        module_order: 2,
                        cursus_id: 'cursus-1',
                        cursus_title: 'Cursus 1',
                        completed_chapters: '0',
                        total_chapters: '4'
                    }
                ]
            } as any)
            .mockResolvedValueOnce({
                rowCount: 0,
                rows: []
            } as any);

        await getNextStep(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.body.nextStep).toEqual({
            action: 'RESUME_MODULE',
            label: 'Reprendre Cursus 1 — Module 1',
            href: '/student/cursus/cursus-1/module-1'
        });
    });

    it('returns in-progress CTF when no module is active', async () => {
        const req = createRequest('student-2');
        const res = createResponse();

        mockedQuery
            .mockResolvedValueOnce({
                rowCount: 1,
                rows: [
                    {
                        module_id: 'module-1',
                        module_title: 'Module 1',
                        module_order: 1,
                        cursus_id: 'cursus-1',
                        cursus_title: 'Cursus 1',
                        completed_chapters: '4',
                        total_chapters: '4'
                    }
                ]
            } as any)
            .mockResolvedValueOnce({
                rowCount: 1,
                rows: [
                    {
                        code: 'REPLAY-001',
                        title: 'Deja Vu',
                        category: 'REPLAY_ATTACK',
                        points: 100,
                        status: 'IN_PROGRESS',
                        started_at: '2026-02-22T00:00:00.000Z'
                    }
                ]
            } as any);

        await getNextStep(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.body.nextStep).toEqual({
            action: 'RESUME_CTF',
            label: 'Continuer REPLAY-001 — Deja Vu',
            href: '/student/ctf/REPLAY-001'
        });
    });

    it('returns the first not-started module when nothing is in progress', async () => {
        const req = createRequest('student-3');
        const res = createResponse();

        mockedQuery
            .mockResolvedValueOnce({
                rowCount: 2,
                rows: [
                    {
                        module_id: 'module-1',
                        module_title: 'Module 1',
                        module_order: 1,
                        cursus_id: 'cursus-1',
                        cursus_title: 'Cursus 1',
                        completed_chapters: '0',
                        total_chapters: '3'
                    },
                    {
                        module_id: 'module-2',
                        module_title: 'Module 2',
                        module_order: 2,
                        cursus_id: 'cursus-1',
                        cursus_title: 'Cursus 1',
                        completed_chapters: '0',
                        total_chapters: '4'
                    }
                ]
            } as any)
            .mockResolvedValueOnce({
                rowCount: 0,
                rows: []
            } as any);

        await getNextStep(req as any, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.body.nextStep).toEqual({
            action: 'START_MODULE',
            label: 'Commencer Cursus 1 — Module 1',
            href: '/student/cursus/cursus-1/module-1'
        });
    });
});
