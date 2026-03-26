import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { VaultAllocationSchema } from '@nav/shared';

const AddressParam = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

const RegisterVaultResponseSchema = z.object({
  success: z.boolean(),
  allocation: VaultAllocationSchema,
});

const GetAllocationsResponseSchema = z.object({
  vaultAddress: z.string(),
  allocations: z.array(VaultAllocationSchema),
});

export const registryRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST /registry/vaults — register vault-protocol mapping
  app.post(
    '/vaults',
    {
      schema: {
        body: VaultAllocationSchema,
        response: {
          201: RegisterVaultResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const allocation = request.body;
      // Stub — full registry persistence out of scope
      return reply.status(201).send({ success: true, allocation });
    },
  );

  // GET /registry/vaults/:address — list protocol allocations
  app.get(
    '/vaults/:address',
    {
      schema: {
        params: AddressParam,
        response: {
          200: GetAllocationsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { address } = request.params;
      // Stub — full registry query out of scope
      return reply.status(200).send({ vaultAddress: address, allocations: [] });
    },
  );
};
