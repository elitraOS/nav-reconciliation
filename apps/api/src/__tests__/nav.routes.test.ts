import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../app.js';

// Mock the nav queue so tests don't need Redis
vi.mock('../queue/nav.queue.js', () => ({
  navQueue: {
    add: vi.fn().mockResolvedValue({ id: 'test-job-id-123' }),
  },
}));

// Mock the DB repository so tests don't need Postgres
vi.mock('../db/nav-snapshot.repo.js', () => ({
  saveNavSnapshot: vi.fn().mockResolvedValue(undefined),
  getLatestNavSnapshot: vi.fn().mockImplementation(async (address: string) => {
    // Return null for unknown vaults
    if (address === '0x0000000000000000000000000000000000000001') {
      return null;
    }
    return null;
  }),
  getNavHistory: vi.fn().mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
  }),
}));

const VALID_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12';
const UNKNOWN_ADDRESS = '0x0000000000000000000000000000000000000001';
const BAD_ADDRESS = 'not-a-valid-address';

describe('NAV Routes', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /vaults/:address/nav', () => {
    it('returns 202 with jobId for a valid address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/vaults/${VALID_ADDRESS}/nav`,
      });

      expect(response.statusCode).toBe(202);
      const body = response.json<{ jobId: string }>();
      expect(body).toHaveProperty('jobId');
      expect(typeof body.jobId).toBe('string');
    });

    it('returns 400 for an invalid address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/vaults/${BAD_ADDRESS}/nav`,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json<{ error: string }>();
      expect(body).toHaveProperty('error');
    });

    it('returns 400 for an address missing 0x prefix', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/vaults/abcdef1234567890abcdef1234567890abcdef12/nav',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /vaults/:address/nav/latest', () => {
    it('returns 404 for an unknown vault', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/vaults/${UNKNOWN_ADDRESS}/nav/latest`,
      });

      expect(response.statusCode).toBe(404);
      const body = response.json<{ error: string }>();
      expect(body).toHaveProperty('error');
    });

    it('returns 400 for an invalid address', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/vaults/${BAD_ADDRESS}/nav/latest`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /vaults/:address/nav/history', () => {
    it('returns paginated results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/vaults/${VALID_ADDRESS}/nav/history`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ data: unknown[]; total: number; page: number; limit: number }>();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('page');
      expect(body).toHaveProperty('limit');
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('returns 400 for invalid address', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/vaults/${BAD_ADDRESS}/nav/history`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
