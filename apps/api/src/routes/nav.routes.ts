import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  NavResultSchema,
  type NavResult,
} from '@nav/shared';
import { navQueue } from '../queue/nav.queue.js';

const AddressParam = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

const TriggerNavBodySchema = z.object({
  blockNumber: z.string().regex(/^\d+$/),
});

const TriggerNavResponse202 = z.object({
  jobId: z.string(),
  status: z.literal('queued'),
});

const TriggerNavResponse200 = NavResultSchema;

const NavHistoryQuerySchema = z.object({
  from: z.string().regex(/^\d+$/).optional(),
  to: z.string().regex(/^\d+$/).optional(),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
});

const NavHistoryResponseSchema = z.object({
  data: z.array(NavResultSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

export const navRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST /vaults/:address/nav — trigger NAV calculation
  app.post(
    '/:address/nav',
    {
      schema: {
        params: AddressParam,
        body: TriggerNavBodySchema,
        response: {
          202: TriggerNavResponse202,
          200: TriggerNavResponse200,
        },
      },
    },
    async (request, reply) => {
      const { address } = request.params;
      const { blockNumber } = request.body;
      const blockNumberBigInt = BigInt(blockNumber);
      const jobId = `${address}:${blockNumber}`;

      // Check for existing job/cache hit (stub — always enqueues)
      const existingJob = await navQueue.getJob(jobId);
      if (existingJob !== undefined && existingJob !== null) {
        const state = await existingJob.getState();
        if (state === 'completed') {
          const result = existingJob.returnvalue as NavResult;
          return reply.status(200).send(result);
        }
      }

      await navQueue.add(
        'calculate-nav',
        { vaultAddress: address, blockNumber: blockNumberBigInt.toString() },
        { jobId },
      );

      return reply.status(202).send({ jobId, status: 'queued' });
    },
  );

  // GET /vaults/:address/nav/latest
  app.get(
    '/:address/nav/latest',
    {
      schema: {
        params: AddressParam,
        response: {
          200: NavResultSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (_request, reply) => {
      // Stub — full DB query out of scope
      return reply.status(404).send({ message: 'No snapshot found' });
    },
  );

  // GET /vaults/:address/nav/history
  app.get(
    '/:address/nav/history',
    {
      schema: {
        params: AddressParam,
        querystring: NavHistoryQuerySchema,
        response: {
          200: NavHistoryResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { from, to, page, limit } = request.query;
      const _fromBlock = from !== undefined ? BigInt(from) : undefined;
      const _toBlock = to !== undefined ? BigInt(to) : undefined;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      // Stub — full DB query out of scope
      return reply.status(200).send({
        data: [],
        page: pageNum,
        limit: limitNum,
        total: 0,
      });
    },
  );
};
