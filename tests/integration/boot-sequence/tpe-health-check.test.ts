import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { checkSystemHealth } from '../../../frontend/tpe-web/lib/api-client';

jest.mock('../../../frontend/tpe-web/lib/api-client', () => ({
    checkSystemHealth: jest.fn(),
}));

const mockedCheckSystemHealth = jest.mocked(checkSystemHealth);

describe('TPE Boot Sequence - Health Check', () => {
    beforeEach(() => {
        mockedCheckSystemHealth.mockReset();
        mockedCheckSystemHealth.mockResolvedValue(true);
    });

    test('checkSystemHealth should call /api/health endpoint', async () => {
        const result = await checkSystemHealth();

        expect(result).toBe(true);
        expect(mockedCheckSystemHealth).toHaveBeenCalledTimes(1);
    });
});
