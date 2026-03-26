import { describe, it, expect } from 'vitest';
import { RawPositionReadSchema, BalanceSnapshotSchema } from '../injector.js';
import { Protocol } from '../enums.js';

describe('RawPositionReadSchema', () => {
  const validRead = {
    protocol: Protocol.AAVE_V3,
    contractAddress: '0xabc123def456abc123def456abc123def456abc1',
    method: 'balanceOf',
    rawValue: '5000000000000000000',
    decimals: 18,
    blockNumber: '19000000',
  };

  it('parses a valid raw position read', () => {
    const result = RawPositionReadSchema.safeParse(validRead);
    expect(result.success).toBe(true);
  });

  it('rejects numeric rawValue (must be string)', () => {
    const result = RawPositionReadSchema.safeParse({
      ...validRead,
      rawValue: 5000000000000000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects numeric blockNumber (must be string)', () => {
    const result = RawPositionReadSchema.safeParse({
      ...validRead,
      blockNumber: 19000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid protocol', () => {
    const result = RawPositionReadSchema.safeParse({
      ...validRead,
      protocol: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('BalanceSnapshotSchema', () => {
  const validSnapshot = {
    address: '0xabc123def456abc123def456abc123def456abc1',
    protocol: Protocol.GMX_V2,
    rawValue: '1000000000',
    decimals: 6,
    blockNumber: '19000000',
    timestamp: 1700000000,
  };

  it('parses a valid balance snapshot', () => {
    const result = BalanceSnapshotSchema.safeParse(validSnapshot);
    expect(result.success).toBe(true);
  });

  it('rejects numeric rawValue (must be string)', () => {
    const result = BalanceSnapshotSchema.safeParse({
      ...validSnapshot,
      rawValue: 1000000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects numeric blockNumber (must be string)', () => {
    const result = BalanceSnapshotSchema.safeParse({
      ...validSnapshot,
      blockNumber: 19000000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid protocol', () => {
    const result = BalanceSnapshotSchema.safeParse({
      ...validSnapshot,
      protocol: 'AAVE',
    });
    expect(result.success).toBe(false);
  });
});
