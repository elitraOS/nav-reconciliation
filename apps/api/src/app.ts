import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import swagger from '@fastify/swagger';
import { navRoutes } from './routes/nav.routes.js';
import { registryRoutes } from './routes/registry.routes.js';
import { jobRoutes } from './routes/jobs.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // CRITICAL: Both must be called — omitting either is a silent runtime bug
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'NAV Reconciliation API',
        version: '1.0.0',
        description: 'NAV Engine API for vault net asset value calculation',
      },
    },
  });

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  await typedApp.register(navRoutes, { prefix: '/vaults' });
  await typedApp.register(registryRoutes, { prefix: '/registry' });
  await typedApp.register(jobRoutes, { prefix: '/jobs' });

  typedApp.get('/docs/json', async (_request, reply) => {
    return reply.send(app.swagger());
  });

  return app;
}
