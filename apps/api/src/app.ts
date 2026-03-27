import Fastify from 'fastify';
import { navRoutes } from './routes/nav.routes.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Health check
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  // Register route plugins
  app.register(navRoutes);

  return app;
}
