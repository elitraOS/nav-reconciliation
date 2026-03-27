import type { FastifyInstance } from 'fastify';
import type { Queue } from 'bullmq';
import { NavResultSchema } from '@nav-reconciliation/shared';
import type { NavSnapshotRepo } from '../db/nav-snapshot.repo.js';
import type { NavJobData } from '../queue/nav.queue.js';

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

function isValidAddress(address: string): boolean {
  return ADDRESS_REGEX.test(address);
}

interface NavRoutesOptions {
  queue: Queue<NavJobData>;
  repo: NavSnapshotRepo;
}

export async function navRoutes(
  fastify: FastifyInstance,
  options: NavRoutesOptions,
): Promise<void> {
  const { queue, repo } = options;

  // POST /vaults/:address/nav → 202 { jobId: string }
  fastify.post<{
    Params: { address: string };
    Body: { blockNumber?: number } | undefined;
  }>('/vaults/:address/nav', async (request, reply) => {
    const { address } = request.params;

    if (!isValidAddress(address)) {
      return reply.status(400).send({
        error: 'Invalid vault address: must be a 0x-prefixed 40-character hex string',
      });
    }

    const blockNumber =
      request.body != null && typeof request.body.blockNumber === 'number'
        ? request.body.blockNumber
        : 0;

    const job = await queue.add('compute-nav', {
      vaultAddress: address.toLowerCase(),
      blockNumber,
    });

    return reply.status(202).send({ jobId: job.id ?? '' });
  });

  // GET /vaults/:address/nav/latest → NavResult JSON
  fastify.get<{ Params: { address: string } }>(
    '/vaults/:address/nav/latest',
    async (request, reply) => {
      const { address } = request.params;

      if (!isValidAddress(address)) {
        return reply.status(400).send({
          error: 'Invalid vault address: must be a 0x-prefixed 40-character hex string',
        });
      }

      const snapshot = await repo.latestByAddress(address.toLowerCase());

      if (snapshot === null) {
        return reply.status(404).send({ error: 'No NAV data found for this vault address' });
      }

      const navResult = {
        recommendedNav: snapshot.recommendedNav,
        currentOnChainNav: snapshot.currentOnChainNav,
        delta: snapshot.delta,
        deltaBps: snapshot.deltaBps,
        breakdown: snapshot.breakdown,
        pendingDeposits: snapshot.pendingDeposits,
        pendingRedemptions: snapshot.pendingRedemptions,
        pendingRedemptionShares: snapshot.pendingRedemptionShares,
        confidence: snapshot.confidence,
        blockNumber: snapshot.blockNumber,
        calculatedAt: snapshot.calculatedAt,
      };

      const parsed = NavResultSchema.safeParse(navResult);
      if (!parsed.success) {
        return reply.status(500).send({ error: 'Internal data validation error' });
      }

      return reply.status(200).send(parsed.data);
    },
  );

  // GET /vaults/:address/nav/history → paginated results
  fastify.get<{
    Params: { address: string };
    Querystring: { page?: string; limit?: string };
  }>('/vaults/:address/nav/history', async (request, reply) => {
    const { address } = request.params;

    if (!isValidAddress(address)) {
      return reply.status(400).send({
        error: 'Invalid vault address: must be a 0x-prefixed 40-character hex string',
      });
    }

    const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '10', 10) || 10));

    const { data, total } = await repo.paginatedHistory(address.toLowerCase(), page, limit);

    return reply.status(200).send({ data, total, page, limit });
  });
}
