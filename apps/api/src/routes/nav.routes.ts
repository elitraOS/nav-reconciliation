import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { navQueue } from '../queue/nav.queue.js';
import {
  getLatestNavSnapshot,
  getNavHistory,
} from '../db/nav-snapshot.repo.js';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function isValidAddress(address: string): boolean {
  return ADDRESS_RE.test(address);
}

interface VaultParams {
  address: string;
}

interface HistoryQuery {
  page?: string;
  limit?: string;
}

export async function navRoutes(app: FastifyInstance): Promise<void> {
  // POST /vaults/:address/nav → 202 { jobId }
  app.post(
    '/vaults/:address/nav',
    async (
      request: FastifyRequest<{ Params: VaultParams }>,
      reply: FastifyReply,
    ) => {
      const { address } = request.params;

      if (!isValidAddress(address)) {
        return reply.status(400).send({
          error: 'Invalid vault address. Must be a 20-byte hex string (0x...).',
        });
      }

      const job = await navQueue.add('compute', { vaultAddress: address });

      return reply.status(202).send({ jobId: job.id });
    },
  );

  // GET /vaults/:address/nav/latest → NavResult or 404
  app.get(
    '/vaults/:address/nav/latest',
    async (
      request: FastifyRequest<{ Params: VaultParams }>,
      reply: FastifyReply,
    ) => {
      const { address } = request.params;

      if (!isValidAddress(address)) {
        return reply.status(400).send({
          error: 'Invalid vault address. Must be a 20-byte hex string (0x...).',
        });
      }

      const snapshot = await getLatestNavSnapshot(address);

      if (!snapshot) {
        return reply.status(404).send({
          error: `No NAV snapshot found for vault ${address}`,
        });
      }

      return reply.status(200).send(snapshot);
    },
  );

  // GET /vaults/:address/nav/history → paginated { data, total, page, limit }
  app.get(
    '/vaults/:address/nav/history',
    async (
      request: FastifyRequest<{ Params: VaultParams; Querystring: HistoryQuery }>,
      reply: FastifyReply,
    ) => {
      const { address } = request.params;

      if (!isValidAddress(address)) {
        return reply.status(400).send({
          error: 'Invalid vault address. Must be a 20-byte hex string (0x...).',
        });
      }

      const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query.limit ?? '20', 10) || 20),
      );

      const result = await getNavHistory(address, page, limit);

      return reply.status(200).send(result);
    },
  );
}
