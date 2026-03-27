import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { navRoutes } from '../routes/nav.routes.js';
import type { NavSnapshotRepo } from '../db/nav-snapshot.repo.js';
import type { Queue } from 'bullmq';
import type { NavJobData } from '../queue/nav.queue.js';
import { Confidence, Protocol } from '@nav-reconciliation/shared';

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';
const INVALID_ADDRESS = 'not-a-valid-address';

const MOCK_SNAPSHOT = {
  id: 'cltest123',
  vaultAddress: VALID_ADDRESS.toLowerCase(),
  blockNumber: '55000000',
  recommendedNav: '1000000',
  currentOnChainNav: '990000',
  delta: '10000',
  deltaBps: '101',
  breakdown: [
    {
      protocol: Protocol.AAVE_V3,
      valueUsdc: '1000000',
      pct: '10000',
      blockNumber: '55000000',
    },
  ],
  pendingDeposits: '0',
  pendingRedemptions: '0',
  pendingRedemptionShares: '0',
  confidence: Confidence.HIGH,
  calculatedAt: new Date().toISOString(),
  createdAt: new Date(),
};

function buildTestApp(repoOverrides?: Partial<NavSnapshotRepo>) {
  const fastify = Fastify({ logger: false });

  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'test-job-id-123' }),
  } as unknown as Queue<NavJobData>;

  const mockRepo: NavSnapshotRepo = {
    insert: vi.fn().mockResolvedValue(undefined),
    latestByAddress: vi.fn().mockResolvedValue(null),
    paginatedHistory: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    ...repoOverrides,
  };

  fastify.register(navRoutes, { queue: mockQueue, repo: mockRepo });

  return { fastify, mockQueue, mockRepo };
}

describe('POST /vaults/:address/nav', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    const { fastify } = buildTestApp();
    app = fastify;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 202 with jobId for a valid address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/vaults/${VALID_ADDRESS}/nav`,
      payload: { blockNumber: 55000000 },
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body) as { jobId: string };
    expect(typeof body.jobId).toBe('string');
    expect(body.jobId).toBe('test-job-id-123');
  });

  it('returns 400 for an invalid (non-hex) vault address', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/vaults/${INVALID_ADDRESS}/nav`,
      payload: { blockNumber: 55000000 },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: string };
    expect(body.error).toMatch(/invalid vault address/i);
  });
});

describe('GET /vaults/:address/nav/latest', () => {
  afterEach(async () => {
    // cleaned up per-test via new app instances
  });

  it('returns 200 with NavResult for a known vault', async () => {
    const { fastify: app } = buildTestApp({
      latestByAddress: vi.fn().mockResolvedValue(MOCK_SNAPSHOT),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/vaults/${VALID_ADDRESS}/nav/latest`,
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as Record<string, unknown>;
    expect(typeof body['recommendedNav']).toBe('string');
    expect(typeof body['currentOnChainNav']).toBe('string');
    expect(typeof body['delta']).toBe('string');
    expect(typeof body['blockNumber']).toBe('string');
  });

  it('returns 404 for an unknown vault', async () => {
    const { fastify: app } = buildTestApp({
      latestByAddress: vi.fn().mockResolvedValue(null),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/vaults/${VALID_ADDRESS}/nav/latest`,
    });

    await app.close();

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as { error: string };
    expect(body.error).toMatch(/no nav data found/i);
  });

  it('returns 400 for an invalid vault address', async () => {
    const { fastify: app } = buildTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/vaults/${INVALID_ADDRESS}/nav/latest`,
    });

    await app.close();

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: string };
    expect(body.error).toMatch(/invalid vault address/i);
  });
});

describe('GET /vaults/:address/nav/history', () => {
  it('returns 200 with paginated result', async () => {
    const { fastify: app } = buildTestApp({
      paginatedHistory: vi.fn().mockResolvedValue({ data: [MOCK_SNAPSHOT], total: 1 }),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/vaults/${VALID_ADDRESS}/nav/history?page=1&limit=10`,
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: unknown[];
      total: number;
      page: number;
      limit: number;
    };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
  });

  it('returns 400 for an invalid vault address', async () => {
    const { fastify: app } = buildTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/vaults/${INVALID_ADDRESS}/nav/history`,
    });

    await app.close();

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: string };
    expect(body.error).toMatch(/invalid vault address/i);
  });
});
