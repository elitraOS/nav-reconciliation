import { describe, it, expect } from 'vitest';
import { PositionBreakdownSchema, NavResultSchema } from '../nav.js';
import { Protocol, Confidence } from '../enums.js';

describe('PositionBreakdownSchema', () => {
  const validBreakdown = {
    protocol: Protocol.AAVE_V3,
    valueUsdc: '1000000',
    pct: '45.5',
    blockNumber: '19000000',
  };

  it('parses a valid position breakdown', () => {
    const result = PositionBreakdownSchema.safeParse(validBreakdown);
    expect(result.success).toBe(true);
  });

  it('rejects numeric valueUsdc (must be string)', () => {
    const result = PositionBreakdownSchema.safeParse({
      ...validBreakdown,
      valueUsdc: 1000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects numeric pct (must be string)', () => {
    const result = PositionBreakdownSchema.safeParse({
      ...validBreakdown,
      pct: 45.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid protocol', () => {
    const result = PositionBreakdownSchema.safeParse({
      ...validBreakdown,
      protocol: 'COMPOUND',
    });
    expect(result.success).toBe(false);
  });
});

describe('NavResultSchema', () => {
  const validNav = {
    recommendedNav: '10000000',
    currentOnChainNav: '9990000',
    delta: '10000',
    deltaBps: '10',
    breakdown: [
      {
        protocol: Protocol.AAVE_V3,
        valueUsdc: '6000000',
        pct: '60.0',
        blockNumber: '19000000',
      },
      {
        protocol: Protocol.IDLE,
        valueUsdc: '4000000',
        pct: '40.0',
        blockNumber: '19000000',
      },
    ],
    pendingDeposits: '100000',
    pendingRedemptions: '50000',
    pendingRedemptionShares: '48000',
    confidence: Confidence.HIGH,
    blockNumber: '19000000',
    calculatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('parses a valid nav result', () => {
    const result = NavResultSchema.safeParse(validNav);
    expect(result.success).toBe(true);
  });

  it('rejects numeric recommendedNav (must be string)', () => {
    const result = NavResultSchema.safeParse({
      ...validNav,
      recommendedNav: 10000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects numeric delta (must be string)', () => {
    const result = NavResultSchema.safeParse({
      ...validNav,
      delta: 10000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid confidence', () => {
    const result = NavResultSchema.safeParse({
      ...validNav,
      confidence: 'VERY_HIGH',
    });
    expect(result.success).toBe(false);
  });

  it('rejects numeric pendingDeposits (must be string)', () => {
    const result = NavResultSchema.safeParse({
      ...validNav,
      pendingDeposits: 100000,
    });
    expect(result.success).toBe(false);
  });
});
