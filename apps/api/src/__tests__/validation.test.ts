import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

const BodySchema = z.object({
  blockNumber: z.string().regex(/^\d+$/),
});

async function buildAppWithoutValidator() {
  const app = Fastify();
  // NOTE: setValidatorCompiler NOT called — this is the regression
  app.setSerializerCompiler(serializerCompiler);

  app.withTypeProvider<ZodTypeProvider>().post(
    '/test',
    {
      schema: {
        body: BodySchema,
      },
    },
    async (request, _reply) => {
      return { received: (request.body as { blockNumber: string }).blockNumber };
    },
  );

  await app.ready();
  return app;
}

async function buildAppWithValidator() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.withTypeProvider<ZodTypeProvider>().post(
    '/test',
    {
      schema: {
        body: BodySchema,
      },
    },
    async (request, _reply) => {
      return { received: (request.body as { blockNumber: string }).blockNumber };
    },
  );

  await app.ready();
  return app;
}

describe('Fastify setValidatorCompiler regression test', () => {
  it('WITHOUT setValidatorCompiler: invalid body passes through (silent bug)', async () => {
    const app = await buildAppWithoutValidator();

    const response = await app.inject({
      method: 'POST',
      url: '/test',
      payload: { blockNumber: 'not-a-number' }, // invalid — should fail validation
    });

    // Without validator compiler, Fastify does NOT validate with Zod schemas
    // so invalid input passes through — this is the silent bug
    expect(response.statusCode).toBe(200);
  });

  it('WITH setValidatorCompiler: invalid body is rejected with 400', async () => {
    const app = await buildAppWithValidator();

    const response = await app.inject({
      method: 'POST',
      url: '/test',
      payload: { blockNumber: 'not-a-number' }, // invalid
    });

    // With validator compiler, Zod schema is enforced
    expect(response.statusCode).toBe(400);
  });

  it('WITH setValidatorCompiler: valid body passes through', async () => {
    const app = await buildAppWithValidator();

    const response = await app.inject({
      method: 'POST',
      url: '/test',
      payload: { blockNumber: '12345' }, // valid
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { received: string };
    expect(body.received).toBe('12345');
  });
});
