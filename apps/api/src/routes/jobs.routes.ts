import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { navQueue } from '../queue/nav.queue.js';

const JobIdParam = z.object({
  jobId: z.string().min(1),
});

const JobStateSchema = z.union([
  z.literal('waiting'),
  z.literal('active'),
  z.literal('completed'),
  z.literal('failed'),
  z.literal('delayed'),
  z.literal('unknown'),
]);

const JobResponseSchema = z.object({
  jobId: z.string(),
  state: JobStateSchema,
  progress: z.number().optional(),
  result: z.unknown().optional(),
  failedReason: z.string().optional(),
  timestamp: z.number(),
});

export const jobRoutes: FastifyPluginAsyncZod = async (app) => {
  // GET /jobs/:jobId — poll BullMQ job status
  app.get(
    '/:jobId',
    {
      schema: {
        params: JobIdParam,
        response: {
          200: JobResponseSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const job = await navQueue.getJob(jobId);

      if (job === undefined || job === null) {
        return reply.status(404).send({ message: `Job ${jobId} not found` });
      }

      const state = await job.getState();
      const validState = [
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      ].includes(state)
        ? (state as z.infer<typeof JobStateSchema>)
        : ('unknown' as const);

      return reply.status(200).send({
        jobId: job.id ?? jobId,
        state: validState,
        progress: typeof job.progress === 'number' ? job.progress : undefined,
        result: job.returnvalue,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
      });
    },
  );
};
