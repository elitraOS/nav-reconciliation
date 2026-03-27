import Fastify from 'fastify';
import { navRoutes } from './routes/nav.routes.js';
import { navQueue } from './queue/nav.queue.js';
import { createNavSnapshotRepo } from './db/nav-snapshot.repo.js';
import { PrismaClient } from '@prisma/client';

export function buildApp() {
  const fastify = Fastify({ logger: true });

  const prisma = new PrismaClient();
  const repo = createNavSnapshotRepo(prisma);

  fastify.register(navRoutes, { queue: navQueue, repo });

  return fastify;
}
