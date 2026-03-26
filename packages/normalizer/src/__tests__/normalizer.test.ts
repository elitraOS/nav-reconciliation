import { describe, it, expect } from 'vitest'
import { createNormalizer } from '../normalizer.js'
import { NormalizerError } from '../errors.js'
import type { RawPositionRead } from '@nav-reconciliation/shared'
import { Protocol } from '@nav-reconciliation/shared'

const BLOCK_TIMESTAMP = '2024-01-15T12:00:00Z'
const BLOCK_NUMBER = '123456'
const CONTRACT_ADDRESS = '0xDeAdBeEf0000000000000000000000000000dead'

function makeRead(overrides: Partial<RawPositionRead> = {}): RawPositionRead {
  return {
    protocol: Protocol.GMX_V2,
    contractAddress: CONTRACT_ADDRESS,
    method: 'totalAssets',
    rawValue: '500000000',
    decimals: 6,
    blockNumber: BLOCK_NUMBER,
    ...overrides,
  }
}

describe('Normalizer', () => {
  const normalizer = createNormalizer()

  // Test 1: Happy path — non-Aave protocol passes rawValue through unchanged
  it('passes through rawValue unchanged for non-Aave protocols', () => {
    const reads: RawPositionRead[] = [makeRead()]
    const snapshots = normalizer.normalize(reads, { blockTimestamp: BLOCK_TIMESTAMP })

    expect(snapshots).toHaveLength(1)
    const snap = snapshots[0]!
    expect(snap.rawValue).toBe('500000000')
    expect(snap.decimals).toBe(6)
    expect(snap.protocol).toBe(Protocol.GMX_V2)
    expect(snap.address).toBe(CONTRACT_ADDRESS)
    expect(snap.blockNumber).toBe(BLOCK_NUMBER)
    // timestamp should be a number (Unix seconds)
    expect(typeof snap.timestamp).toBe('number')
    expect(snap.timestamp).toBe(Math.floor(Date.parse(BLOCK_TIMESTAMP) / 1000))
  })

  // Test 2: Aave USD → USDC conversion
  // totalCollateralBase = "100000000000" (1000 USD in 8dec)
  // usdcPriceUsd = "100000000" (1.0 USD per USDC in 8dec)
  // expected rawValue = (100000000000 * 1_000_000) / 100000000 = 1000000000 (1000 USDC in 6dec)
  it('converts Aave V3 totalCollateralBase (USD/8dec) to USDC (6dec)', () => {
    const reads: RawPositionRead[] = [
      makeRead({
        protocol: Protocol.AAVE_V3,
        rawValue: '100000000000',
        decimals: 8,
      }),
    ]
    const snapshots = normalizer.normalize(reads, {
      usdcPriceUsd: '100000000',
      blockTimestamp: BLOCK_TIMESTAMP,
    })

    expect(snapshots).toHaveLength(1)
    const snap = snapshots[0]!
    expect(snap.rawValue).toBe('1000000000')
    expect(snap.decimals).toBe(6)
    expect(snap.protocol).toBe(Protocol.AAVE_V3)
  })

  // Test 3: Malformed input — missing required field → NormalizerError with field name
  it('throws NormalizerError with field name on malformed input', () => {
    const badRead = {
      // missing 'protocol' — only contractAddress + rawValue etc present
      contractAddress: CONTRACT_ADDRESS,
      method: 'totalAssets',
      rawValue: '100',
      decimals: 6,
      blockNumber: BLOCK_NUMBER,
    } as unknown as RawPositionRead

    expect(() =>
      normalizer.normalize([badRead], { blockTimestamp: BLOCK_TIMESTAMP })
    ).toThrow(NormalizerError)

    try {
      normalizer.normalize([badRead], { blockTimestamp: BLOCK_TIMESTAMP })
    } catch (err) {
      expect(err).toBeInstanceOf(NormalizerError)
      const e = err as NormalizerError
      expect(e.field).toBeTruthy()
      expect(e.field).toBe('protocol')
    }
  })

  // Test 4: BigInt accuracy — very large values must not lose precision
  it('handles very large values (10^30) without precision loss', () => {
    const largeValue = '1' + '0'.repeat(30) // 10^30
    const reads: RawPositionRead[] = [
      makeRead({
        protocol: Protocol.GMX_V2,
        rawValue: largeValue,
        decimals: 30,
      }),
    ]

    const snapshots = normalizer.normalize(reads, { blockTimestamp: BLOCK_TIMESTAMP })
    expect(snapshots[0]!.rawValue).toBe(largeValue)
    expect(snapshots[0]!.decimals).toBe(30)
  })

  // Test 5: Missing usdcPriceUsd for Aave entry → NormalizerError
  it('throws NormalizerError when usdcPriceUsd is missing for AAVE_V3', () => {
    const reads: RawPositionRead[] = [
      makeRead({
        protocol: Protocol.AAVE_V3,
        rawValue: '100000000000',
        decimals: 8,
      }),
    ]

    expect(() =>
      normalizer.normalize(reads, { blockTimestamp: BLOCK_TIMESTAMP })
    ).toThrow(NormalizerError)

    try {
      normalizer.normalize(reads, { blockTimestamp: BLOCK_TIMESTAMP })
    } catch (err) {
      expect(err).toBeInstanceOf(NormalizerError)
      const e = err as NormalizerError
      expect(e.field).toBe('usdcPriceUsd')
    }
  })

  // Bonus: IDLE pass-through
  it('passes through IDLE protocol rawValue unchanged', () => {
    const reads: RawPositionRead[] = [
      makeRead({ protocol: Protocol.IDLE, rawValue: '999999999999', decimals: 18 }),
    ]
    const snapshots = normalizer.normalize(reads, { blockTimestamp: BLOCK_TIMESTAMP })
    expect(snapshots[0]!.rawValue).toBe('999999999999')
    expect(snapshots[0]!.decimals).toBe(18)
  })
})
