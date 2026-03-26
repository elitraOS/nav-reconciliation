import { Queue } from 'bullmq';

export const NAV_QUEUE_NAME = 'nav-calculation';

export interface NavJobData {
  vaultAddress: string;
  blockNumber: string; // serialized bigint as string
}

export const navQueue = new Queue<NavJobData>(NAV_QUEUE_NAME, {
  connection: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
  },
});
