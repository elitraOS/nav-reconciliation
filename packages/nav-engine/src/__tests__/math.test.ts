import { describe, it, expect } from 'vitest';
import {
  sumPositionValues,
  computeDelta,
  computeDeltaBps,
  computePct,
  computePendingRedemptionsUsdc,
  absValue,
  isMetaMethod,
  META_METHODS,
} from '../math.js';

describe('isMetaMethod', () => {
  it('returns true for all known meta methods', () => {
    for (const m of META_METHODS) {
      expect(isMetaMethod(m)).toBe(true);
    }
  });

  it('returns false for protocol position methods', () => {
    expect(isMetaMethod('AAVE_V3')).toBe(false);
    expect(isMetaMethod('GMX_V2')).toBe(false);
    expect(isMetaMethod('balanceOf')).toBe(false);
  });
});

describe('sumPositionValues', () => {
  it('returns 0n for empty array', () => {
    expect(sumPositionValues([])).toBe(0n);
  });

  it('sums multiple values correctly', () => {
    expect(sumPositionValues([1_000_000n, 2_000_000n, 3_000_000n])).toBe(6_000_000n);
  });

  it('handles single value', () => {
    expect(sumPositionValues([42n])).toBe(42n);
  });

  it('handles zero values', () => {
    expect(sumPositionValues([0n, 0n, 0n])).toBe(0n);
  });
});

describe('computeDelta', () => {
  it('returns positive delta when recommended > on-chain', () => {
    expect(computeDelta(11_000_000n, 10_000_000n)).toBe(1_000_000n);
  });

  it('returns negative delta when recommended < on-chain', () => {
    expect(computeDelta(9_000_000n, 10_000_000n)).toBe(-1_000_000n);
  });

  it('returns zero when equal', () => {
    expect(computeDelta(10_000_000n, 10_000_000n)).toBe(0n);
  });
});

describe('computeDeltaBps', () => {
  it('returns 0 when currentOnChainNav is 0', () => {
    expect(computeDeltaBps(1_000n, 0n)).toBe(0n);
  });

  it('computes correct bps for 1% positive deviation', () => {
    // delta = 100_000, currentOnChainNav = 10_000_000 → 100 bps
    expect(computeDeltaBps(100_000n, 10_000_000n)).toBe(100n);
  });

  it('computes correct bps for negative deviation', () => {
    // delta = -50_000, currentOnChainNav = 10_000_000 → -50 bps
    expect(computeDeltaBps(-50_000n, 10_000_000n)).toBe(-50n);
  });

  it('uses scale-before-divide to preserve precision', () => {
    // 1 unit delta on 10_000_000 → 1 bps
    expect(computeDeltaBps(1_000n, 10_000_000n)).toBe(1n);
  });
});

describe('computePct', () => {
  it('returns 0 when totalNav is 0', () => {
    expect(computePct(1_000_000n, 0n)).toBe(0n);
  });

  it('computes 50% as 5000 bps', () => {
    expect(computePct(5_000_000n, 10_000_000n)).toBe(5000n);
  });

  it('computes 100% as 10000 bps', () => {
    expect(computePct(10_000_000n, 10_000_000n)).toBe(10_000n);
  });

  it('computes 0 for zero position', () => {
    expect(computePct(0n, 10_000_000n)).toBe(0n);
  });

  it('uses scale-before-divide to preserve precision', () => {
    // 1 unit out of 10_000 → 1 bps
    expect(computePct(1n, 10_000n)).toBe(1n);
  });
});

describe('computePendingRedemptionsUsdc', () => {
  it('returns 0 for zero shares', () => {
    expect(computePendingRedemptionsUsdc(0n, 1_000_000n)).toBe(0n);
  });

  it('converts 1e18 shares at 1:1 share price to 1 USDC (6 dec)', () => {
    // 1 share (1e18) * 1_000_000 (share price in USDC 6 dec) / 1e18 = 1_000_000
    expect(computePendingRedemptionsUsdc(1_000_000_000_000_000_000n, 1_000_000n)).toBe(1_000_000n);
  });

  it('handles fractional shares (rounded down)', () => {
    // 0.5 shares = 5e17, share price = 2_000_000 (2 USDC)
    // expected = (5e17 * 2_000_000) / 1e18 = 1_000_000
    expect(computePendingRedemptionsUsdc(500_000_000_000_000_000n, 2_000_000n)).toBe(1_000_000n);
  });
});

describe('absValue', () => {
  it('returns value for positive bigint', () => {
    expect(absValue(100n)).toBe(100n);
  });

  it('returns positive for negative bigint', () => {
    expect(absValue(-100n)).toBe(100n);
  });

  it('returns 0 for 0', () => {
    expect(absValue(0n)).toBe(0n);
  });
});
