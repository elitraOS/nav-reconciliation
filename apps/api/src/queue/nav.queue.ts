import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { computeNav } from '../services/nav.service.js';
import { createNavSnapshotRepo } from '../db/nav-snapshot.repo.js';
import { PrismaClient } from '@prisma/client';

export interface NavJobData {
  vaultAddress: string;
  blockNumber: number;
}

const QUEUE_NAME = 'nav-calculation';

const connection = new IORedis({
  maxRetriesPerRequest: null,
  host: process.env['REDIS_HOST'] ?? '127.0.0.1',
  port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
});

export const navQueue = new Queue<NavJobData>(QUEUE_NAME, { connection });

const prisma = new PrismaClient();
const repo = createNavSnapshotRepo(prisma);

export const navWorker = new Worker<NavJobData>(
  QUEUE_NAME,
  async (job) => {
    const { vaultAddress, blockNumber } = job.data;
    const result = await computeNav(vaultAddress, blockNumber);
    await repo.insert(vaultAddress.toLowerCase(), result);
    return result;
  },
  { connection },
);
