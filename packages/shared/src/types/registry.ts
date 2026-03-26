import { z } from 'zod';
import { Chain, Protocol } from './enums.js';

export const VaultAllocationSchema = z.object({
  vaultAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  protocol: z.nativeEnum(Protocol),
  chain: z.nativeEnum(Chain),
  allocationBps: z.number().int().min(0).max(10000),
});

export type VaultAllocation = z.infer<typeof VaultAllocationSchema>;

export interface IProtocolRegistry {
  registerVault(allocation: VaultAllocation): Promise<void>;
  getAllocations(vaultAddress: string): Promise<VaultAllocation[]>;
  getSupportedProtocols(): Protocol[];
}
