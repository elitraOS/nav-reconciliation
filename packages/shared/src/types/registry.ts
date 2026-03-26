import { z } from 'zod';
import { Protocol } from './enums.js';

export const ProtocolAllocationSchema = z.object({
  protocol: z.nativeEnum(Protocol),
  chainId: z.number(),
  contractAddress: z.string(),
});

export type ProtocolAllocation = z.infer<typeof ProtocolAllocationSchema>;

export const VaultConfigSchema = z.object({
  address: z.string(),
  chainId: z.number(),
  underlyingToken: z.string(),
  underlyingDecimals: z.number(),
  standard: z.literal('ERC-7540'),
  protocols: z.array(ProtocolAllocationSchema),
});

export type VaultConfig = z.infer<typeof VaultConfigSchema>;
