import { z } from 'zod';
import { Chain, Protocol } from './enums.js';

export const BalanceSnapshotSchema = z.object({
  vaultAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  protocol: z.nativeEnum(Protocol),
  chain: z.nativeEnum(Chain),
  blockNumber: z.bigint(),
  timestamp: z.bigint(),
  rawValue: z.bigint(),
  tokenAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  tokenDecimals: z.number().int().min(0).max(18),
});

export type BalanceSnapshot = z.infer<typeof BalanceSnapshotSchema>;

export interface IProtocolInjector {
  readonly protocol: Protocol;
  readonly supportedChains: readonly Chain[];
  fetchBalances(
    vaultAddress: string,
    blockNumber: bigint,
  ): Promise<BalanceSnapshot[]>;
}
