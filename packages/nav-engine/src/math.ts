/**
 * Pure BigInt NAV math — no Number(), no parseFloat().
 */

/** Methods in RawPositionRead that are metadata, not investable positions. */
export const META_METHODS = new Set([
  'totalAssets',
  'totalSupply',
  'sharePrice',
  'highWaterMark',
  'pendingDeposits',
  'pendingRedemptions',
]);

export function isMetaMethod(method: string): boolean {
  return META_METHODS.has(method);
}

export function sumPositionValues(values: readonly bigint[]): bigint {
  let total = 0n;
  for (const v of values) {
    total += v;
  }
  return total;
}

export function computeDelta(recommendedNav: bigint, currentOnChainNav: bigint): bigint {
  return recommendedNav - currentOnChainNav;
}

/** scale-before-divide: (delta * 10_000) / currentOnChainNav */
export function computeDeltaBps(delta: bigint, currentOnChainNav: bigint): bigint {
  if (currentOnChainNav === 0n) return 0n;
  return (delta * 10_000n) / currentOnChainNav;
}

/** pct in basis points out of 10_000 */
export function computePct(valueUsdc: bigint, totalNav: bigint): bigint {
  if (totalNav === 0n) return 0n;
  return (valueUsdc * 10_000n) / totalNav;
}

/**
 * Compute USDC value of pending redemption shares.
 * sharePrice6Dec = convertToAssets(1e18) in USDC 6-dec.
 * pendingShares is in 18-dec.
 * result = (pendingShares * sharePrice6Dec) / 1e18
 */
export function computePendingRedemptionsUsdc(
  pendingShares: bigint,
  sharePrice6Dec: bigint,
): bigint {
  return (pendingShares * sharePrice6Dec) / 1_000_000_000_000_000_000n;
}

export function absValue(n: bigint): bigint {
  return n < 0n ? -n : n;
}
