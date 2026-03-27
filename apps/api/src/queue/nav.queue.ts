import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { NavResultSchema } from '@nav-reconciliation/shared';
import { saveNavSnapshot } from '../db/nav-snapshot.repo.js';

export interface NavJobData {
  vaultAddress: string;
  blockNumber?: string;
}

const QUEUE_NAME = 'nav-compute';

function createRedisConnection(): IORedis {
  const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export const navQueue = new Queue<NavJobData>(QUEUE_NAME, {
  connection: createRedisConnection(),
});

export function startWorker(
  computeFn: (vaultAddress: string, blockNumber?: bigint) => Promise<unknown>,
): Worker<NavJobData> {
  const connection = createRedisConnection();

  const worker = new Worker<NavJobData>(
    QUEUE_NAME,
    async (job: Job<NavJobData>) => {
      const { vaultAddress, blockNumber } = job.data;
      const blockBigInt = blockNumber !== undefined ? BigInt(blockNumber) : undefined;

      const rawResult = await computeFn(vaultAddress, blockBigInt);

      // Validate through NavResultSchema
      const navResult = NavResultSchema.parse(rawResult);

      // Persist to database
      await saveNavSnapshot(vaultAddress, navResult);

      return navResult;
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id ?? 'unknown'} failed:`, err);
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed for vault ${job.data.vaultAddress}`);
  });

  return worker;
}
