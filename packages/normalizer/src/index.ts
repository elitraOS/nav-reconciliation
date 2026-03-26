import type { BalanceSnapshot } from '@nav/shared';

export interface NormalizedBalance {
  vaultAddress: string;
  blockNumber: bigint;
  normalizedValue: bigint;
  decimals: number;
}

// Placeholder — normalize raw balances to 18 decimal places
export function normalizeBalance(snapshot: BalanceSnapshot): NormalizedBalance {
  const scaleFactor = 10n ** BigInt(18 - snapshot.tokenDecimals);
  return {
    vaultAddress: snapshot.vaultAddress,
    blockNumber: snapshot.blockNumber,
    normalizedValue: snapshot.rawValue * scaleFactor,
    decimals: 18,
  };
}

export type { BalanceSnapshot };
