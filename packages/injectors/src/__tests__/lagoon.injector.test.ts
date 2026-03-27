import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Protocol } from '@nav-reconciliation/shared';
import { InjectorError } from '../errors.js';

// Mock viem before importing the injector
const mockReadContract = vi.fn();
const mockGetBlockNumber = vi.fn();
const mockMulticall = vi.fn();

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: mockReadContract,
      getBlockNumber: mockGetBlockNumber,
      multicall: mockMulticall,
    })),
    http: vi.fn((url: string) => ({ url })),
  };
});

// Mock @bgd-labs/aave-address-book
vi.mock('@bgd-labs/aave-address-book', () => ({
  AaveV3Avalanche: {
    POOL: '0xPool1111111111111111111111111111111111111',
  },
}));

import { createLagoonInjector } from '../lagoon.injector.js';

const VAULT_ADDRESS = '0x3048925b3ea5a8c12eecccb8810f5f7544db54af';
const USDC_ADDRESS = '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e';
const VAULT_TOKEN_ADDRESS = '0x3048925b3ea5a8c12eecccb8810f5f7544db54af';
const PENDING_SILO = '0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`;
const GMX_READER = '0x0f010009e875b68dce23d93f5db3e06d3b812e9d';
const GMX_DATA_STORE = '0x2f43c6475f1ecbdbf3a8d2d5b54be78b64a14c29';
const PINNED_BLOCK = 50000000n;

const baseConfig = {
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  usdcAddress: USDC_ADDRESS,
  vaultTokenAddress: VAULT_TOKEN_ADDRESS,
};

type MulticallResult =
  | { status: 'success'; result: unknown }
  | { status: 'failure'; error: Error };

function buildMulticallResults(overrides: Record<number, MulticallResult> = {}): MulticallResult[] {
  const defaults: MulticallResult[] = [
    { status: 'success', result: 1000000n },            // 0: totalAssets
    { status: 'success', result: 2000000000000000000n }, // 1: totalSupply
    { status: 'success', result: 500000n },              // 2: sharePrice
    { status: 'success', result: 1100000n },             // 3: highWaterMark
    { status: 'success', result: 50000n },               // 4: pendingDeposits
    { status: 'success', result: 100000000000000000n },  // 5: pendingRedemptions
    {                                                    // 6: AAVE_V3
      status: 'success',
      result: [
        800000000000n, // totalCollateralBase (USD/8 dec)
        200000000000n, // totalDebtBase
        600000000000n, // availableBorrowsBase
        8000n,         // currentLiquidationThreshold
        7500n,         // ltv
        2000000000000000000n, // healthFactor
      ],
    },
  ];

  return defaults.map((d, i) => overrides[i] ?? d);
}

describe('createLagoonInjector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContract.mockResolvedValue(PENDING_SILO);
    mockGetBlockNumber.mockResolvedValue(PINNED_BLOCK);
    mockMulticall.mockResolvedValue(buildMulticallResults());
  });

  it('throws InjectorError when no RPC URL is provided', () => {
    const savedEnv = process.env['AVALANCHE_RPC_URL'];
    delete process.env['AVALANCHE_RPC_URL'];
    expect(() =>
      createLagoonInjector({ usdcAddress: USDC_ADDRESS, vaultTokenAddress: VAULT_TOKEN_ADDRESS })
    ).toThrow(InjectorError);
    if (savedEnv !== undefined) {
      process.env['AVALANCHE_RPC_URL'] = savedEnv;
    }
  });

  it('uses AVALANCHE_RPC_URL env var when rpcUrl is not in config', () => {
    process.env['AVALANCHE_RPC_URL'] = 'https://env-rpc.example.com';
    expect(() =>
      createLagoonInjector({ usdcAddress: USDC_ADDRESS, vaultTokenAddress: VAULT_TOKEN_ADDRESS })
    ).not.toThrow();
    delete process.env['AVALANCHE_RPC_URL'];
  });

  it('fetches pendingSilo before the multicall', async () => {
    const injector = createLagoonInjector(baseConfig);
    await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    expect(mockReadContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'pendingSilo' })
    );
    expect(mockMulticall).toHaveBeenCalledTimes(1);
  });

  it('returns all required fields', async () => {
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    const methods = reads.map((r) => r.method);
    expect(methods).toContain('totalAssets');
    expect(methods).toContain('totalSupply');
    expect(methods).toContain('sharePrice');
    expect(methods).toContain('highWaterMark');
    expect(methods).toContain('pendingDeposits');
    expect(methods).toContain('pendingRedemptions');
    expect(methods).toContain('AAVE_V3');
  });

  it('returns all rawValue fields as strings', async () => {
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    for (const read of reads) {
      expect(typeof read.rawValue).toBe('string');
    }
  });

  it('has consistent blockNumber across all reads', async () => {
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    const blockNumbers = reads.map((r) => r.blockNumber);
    const unique = new Set(blockNumbers);
    expect(unique.size).toBe(1);
    expect(blockNumbers[0]).toBe(PINNED_BLOCK.toString());
  });

  it('pins blockNumber to provided value', async () => {
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    expect(reads.every((r) => r.blockNumber === PINNED_BLOCK.toString())).toBe(true);
  });

  it('calls getBlockNumber when no blockNumber provided', async () => {
    mockGetBlockNumber.mockResolvedValue(99999n);
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS);

    expect(mockGetBlockNumber).toHaveBeenCalled();
    expect(reads.every((r) => r.blockNumber === '99999')).toBe(true);
  });

  it('uses allowFailure: true in multicall', async () => {
    const injector = createLagoonInjector(baseConfig);
    await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    expect(mockMulticall).toHaveBeenCalledWith(
      expect.objectContaining({ allowFailure: true })
    );
  });

  it('throws InjectorError with field name when a required read fails', async () => {
    mockMulticall.mockResolvedValue(
      buildMulticallResults({
        0: { status: 'failure', error: new Error('revert') },
      })
    );

    const injector = createLagoonInjector(baseConfig);
    await expect(injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK)).rejects.toThrow(InjectorError);

    mockMulticall.mockResolvedValue(
      buildMulticallResults({
        0: { status: 'failure', error: new Error('revert') },
      })
    );
    await expect(injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK)).rejects.toMatchObject({
      field: 'totalAssets',
    });
  });

  it('throws InjectorError when AAVE_V3 read fails', async () => {
    mockMulticall.mockResolvedValue(
      buildMulticallResults({
        6: { status: 'failure', error: new Error('revert') },
      })
    );

    const injector = createLagoonInjector(baseConfig);
    await expect(injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK)).rejects.toMatchObject({
      field: 'AAVE_V3',
    });
  });

  it('sets correct decimals for each read', async () => {
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    const byMethod = Object.fromEntries(reads.map((r) => [r.method, r]));
    expect(byMethod['totalAssets']?.decimals).toBe(6);
    expect(byMethod['totalSupply']?.decimals).toBe(18);
    expect(byMethod['sharePrice']?.decimals).toBe(6);
    expect(byMethod['highWaterMark']?.decimals).toBe(6);
    expect(byMethod['pendingDeposits']?.decimals).toBe(6);
    expect(byMethod['pendingRedemptions']?.decimals).toBe(18);
    expect(byMethod['AAVE_V3']?.decimals).toBe(8);
  });

  it('sets AAVE_V3 protocol for Aave read', async () => {
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    const aaveRead = reads.find((r) => r.method === 'AAVE_V3');
    expect(aaveRead?.protocol).toBe(Protocol.AAVE_V3);
  });

  it('includes GMX_V2 read when gmxReader and gmxDataStore are configured', async () => {
    mockMulticall.mockResolvedValue([
      ...buildMulticallResults(),
      { status: 'success', result: [] },
    ]);

    const injector = createLagoonInjector({
      ...baseConfig,
      gmxReader: GMX_READER,
      gmxDataStore: GMX_DATA_STORE,
    });
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    const gmxRead = reads.find((r) => r.method === 'GMX_V2');
    expect(gmxRead).toBeDefined();
    expect(gmxRead?.protocol).toBe(Protocol.GMX_V2);
  });

  it('omits GMX_V2 when not configured', async () => {
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    const gmxRead = reads.find((r) => r.method === 'GMX_V2');
    expect(gmxRead).toBeUndefined();
  });

  it('stores totalCollateralBase as rawValue for AAVE_V3', async () => {
    const injector = createLagoonInjector(baseConfig);
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    const aaveRead = reads.find((r) => r.method === 'AAVE_V3');
    expect(aaveRead?.rawValue).toBe('800000000000');
  });

  it('stores position count as rawValue for GMX_V2', async () => {
    mockMulticall.mockResolvedValue([
      ...buildMulticallResults(),
      { status: 'success', result: [{ position: 1 }, { position: 2 }] },
    ]);

    const injector = createLagoonInjector({
      ...baseConfig,
      gmxReader: GMX_READER,
      gmxDataStore: GMX_DATA_STORE,
    });
    const reads = await injector.fetchAll(VAULT_ADDRESS, PINNED_BLOCK);

    const gmxRead = reads.find((r) => r.method === 'GMX_V2');
    expect(gmxRead?.rawValue).toBe('2');
  });
});
