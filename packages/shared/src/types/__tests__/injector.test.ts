import { describe, it, expect } from 'vitest';
import { BalanceSnapshotSchema } from '../injector.js';
import { Chain, Protocol } from '../enums.js';

describe('BalanceSnapshotSchema', () => {
  const validSnapshot = {
    vaultAddress: '0xabc123def456abc123def456abc123def456abc1',
    protocol: Protocol.Aave,
    chain: Chain.Ethereum,
    blockNumber: 1000000n,
    timestamp: 1700000000n,
    rawValue: 5000000000000000000n,
    tokenAddress: '0xdef456abc123def456abc123def456abc123def4',
    tokenDecimals: 18,
  };

  it('parses a valid balance snapshot', () => {
    const result = BalanceSnapshotSchema.safeParse(validSnapshot);
    expect(result.success).toBe(true);
  });

  it('rejects non-bigint blockNumber', () => {
    const result = BalanceSnapshotSchema.safeParse({
      ...validSnapshot,
      blockNumber: 1000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid vault address format', () => {
    const result = BalanceSnapshotSchema.safeParse({
      ...validSnapshot,
      vaultAddress: 'not-an-address',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid protocol', () => {
    const result = BalanceSnapshotSchema.safeParse({
      ...validSnapshot,
      protocol: 'InvalidProtocol',
    });
    expect(result.success).toBe(false);
  });

  it('rejects number rawValue (must be bigint)', () => {
    const result = BalanceSnapshotSchema.safeParse({
      ...validSnapshot,
      rawValue: 5000000000000000000,
    });
    expect(result.success).toBe(false);
  });
});
