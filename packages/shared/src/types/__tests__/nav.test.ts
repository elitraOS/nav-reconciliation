import { describe, it, expect } from 'vitest';
import { NavResultSchema } from '../nav.js';

describe('NavResultSchema', () => {
  const validNav = {
    vaultAddress: '0xabc123def456abc123def456abc123def456abc1',
    blockNumber: 1000000n,
    timestamp: 1700000000n,
    totalNav: 10000000000000000000n,
    sharePrice: 1050000000000000000n,
    totalSupply: 9523809523809523809n,
    totalAssets: 10000000000000000000n,
    finalized: true,
  };

  it('parses a valid nav result', () => {
    const result = NavResultSchema.safeParse(validNav);
    expect(result.success).toBe(true);
  });

  it('rejects number totalNav (must be bigint)', () => {
    const result = NavResultSchema.safeParse({
      ...validNav,
      totalNav: 10000000000000000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects number sharePrice (must be bigint)', () => {
    const result = NavResultSchema.safeParse({
      ...validNav,
      sharePrice: 1050000000000000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects string sharePrice', () => {
    const result = NavResultSchema.safeParse({
      ...validNav,
      sharePrice: '1050000000000000000',
    });
    expect(result.success).toBe(false);
  });

  it('sharePrice and totalNav are bigint in parsed output', () => {
    const result = NavResultSchema.safeParse(validNav);
    if (!result.success) throw new Error('Expected success');
    expect(typeof result.data.sharePrice).toBe('bigint');
    expect(typeof result.data.totalNav).toBe('bigint');
  });
});
