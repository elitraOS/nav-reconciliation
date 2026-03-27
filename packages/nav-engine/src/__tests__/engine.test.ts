import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Protocol, Confidence } from '@nav-reconciliation/shared';
import type { RawPositionRead, BalanceSnapshot, VaultConfig } from '@nav-reconciliation/shared';
import type { Registry } from '@nav-reconciliation/registry';
import type { LagoonInjector } from '@nav-reconciliation/injectors';
import type { Normalizer } from '@nav-reconciliation/normalizer';
import { createNavEngine } from '../engine.js';
import { NavEngineError } from '../errors.js';

// ── Fixture helpers ──────────────────────────────────────────────────────────

const VAULT_ADDRESS = '0x3048925b3ea5a8c12eecccb8810f5f7544db54af';
const BLOCK = '12345678';

const VAULT_CONFIG: VaultConfig = {
  address: VAULT_ADDRESS,
  chainId: 43114,
  underlyingToken: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
  underlyingDecimals: 6,
  standard: 'ERC-7540',
  protocols: [
    { protocol: Protocol.AAVE_V3, chainId: 43114, contractAddress: '0xaave' },
    { protocol: Protocol.GMX_V2, chainId: 43114, contractAddress: '0xgmx' },
  ],
};

/**
 * Build a standard set of raw reads.
 * totalAssets        = currentOnChainNav (USDC 6 dec)
 * aaveValueUsdc      = normalised AAVE position (USDC 6 dec, already converted)
 * gmxValueUsdc       = normalised GMX position  (USDC 6 dec)
 */
function makeRawReads(opts: {
  totalAssets: string;
  aaveRaw: string;   // raw collateral in USD 8 dec (before normalisation)
  gmxRaw?: string;   // position count or 0
  pendingDeposits?: string;
  pendingRedemptionShares?: string;
  sharePrice?: string;
}): RawPositionRead[] {
  return [
    {
      protocol: Protocol.IDLE,
      contractAddress: VAULT_ADDRESS,
      method: 'totalAssets',
      rawValue: opts.totalAssets,
      decimals: 6,
      blockNumber: BLOCK,
    },
    {
      protocol: Protocol.IDLE,
      contractAddress: VAULT_ADDRESS,
      method: 'totalSupply',
      rawValue: '10000000000000000000',
      decimals: 18,
      blockNumber: BLOCK,
    },
    {
      protocol: Protocol.IDLE,
      contractAddress: VAULT_ADDRESS,
      method: 'sharePrice',
      rawValue: opts.sharePrice ?? '1000000',
      decimals: 6,
      blockNumber: BLOCK,
    },
    {
      protocol: Protocol.IDLE,
      contractAddress: VAULT_ADDRESS,
      method: 'highWaterMark',
      rawValue: '1000000',
      decimals: 6,
      blockNumber: BLOCK,
    },
    {
      protocol: Protocol.IDLE,
      contractAddress: '0xusdc',
      method: 'pendingDeposits',
      rawValue: opts.pendingDeposits ?? '0',
      decimals: 6,
      blockNumber: BLOCK,
    },
    {
      protocol: Protocol.IDLE,
      contractAddress: '0xvaulttoken',
      method: 'pendingRedemptions',
      rawValue: opts.pendingRedemptionShares ?? '0',
      decimals: 18,
      blockNumber: BLOCK,
    },
    {
      protocol: Protocol.AAVE_V3,
      contractAddress: '0xaave',
      method: 'AAVE_V3',
      rawValue: opts.aaveRaw,
      decimals: 8,
      blockNumber: BLOCK,
    },
    {
      protocol: Protocol.GMX_V2,
      contractAddress: '0xgmx',
      method: 'GMX_V2',
      rawValue: opts.gmxRaw ?? '0',
      decimals: 0,
      blockNumber: BLOCK,
    },
  ];
}

/**
 * Build corresponding BalanceSnapshots for the raw reads above.
 * The mock normalizer returns these directly, so we control the normalised values.
 * aaveValueUsdc / gmxValueUsdc are in USDC 6 dec (post-normalisation).
 */
function makeSnapshots(opts: {
  totalAssets: string;
  aaveValueUsdc: string;
  gmxValueUsdc?: string;
  pendingDeposits?: string;
  pendingRedemptionShares?: string;
  sharePrice?: string;
}): BalanceSnapshot[] {
  return [
    {
      address: VAULT_ADDRESS,
      protocol: Protocol.IDLE,
      rawValue: opts.totalAssets,
      decimals: 6,
      blockNumber: BLOCK,
      timestamp: 1_700_000_000,
    },
    {
      address: VAULT_ADDRESS,
      protocol: Protocol.IDLE,
      rawValue: '10000000000000000000',
      decimals: 18,
      blockNumber: BLOCK,
      timestamp: 1_700_000_000,
    },
    {
      address: VAULT_ADDRESS,
      protocol: Protocol.IDLE,
      rawValue: opts.sharePrice ?? '1000000',
      decimals: 6,
      blockNumber: BLOCK,
      timestamp: 1_700_000_000,
    },
    {
      address: VAULT_ADDRESS,
      protocol: Protocol.IDLE,
      rawValue: '1000000',
      decimals: 6,
      blockNumber: BLOCK,
      timestamp: 1_700_000_000,
    },
    {
      address: '0xusdc',
      protocol: Protocol.IDLE,
      rawValue: opts.pendingDeposits ?? '0',
      decimals: 6,
      blockNumber: BLOCK,
      timestamp: 1_700_000_000,
    },
    {
      address: '0xvaulttoken',
      protocol: Protocol.IDLE,
      rawValue: opts.pendingRedemptionShares ?? '0',
      decimals: 18,
      blockNumber: BLOCK,
      timestamp: 1_700_000_000,
    },
    {
      address: '0xaave',
      protocol: Protocol.AAVE_V3,
      rawValue: opts.aaveValueUsdc,
      decimals: 6,
      blockNumber: BLOCK,
      timestamp: 1_700_000_000,
    },
    {
      address: '0xgmx',
      protocol: Protocol.GMX_V2,
      rawValue: opts.gmxValueUsdc ?? '0',
      decimals: 6,
      blockNumber: BLOCK,
      timestamp: 1_700_000_000,
    },
  ];
}

// ── Mock factories ────────────────────────────────────────────────────────────

function makeMocks() {
  const mockRegistry: Registry = {
    getVaultConfig: vi.fn().mockReturnValue(VAULT_CONFIG),
    listVaults: vi.fn().mockReturnValue([VAULT_CONFIG]),
  };
  const mockInjector: LagoonInjector = {
    fetchAll: vi.fn(),
  };
  const mockNormalizer: Normalizer = {
    normalize: vi.fn(),
  };
  return { mockRegistry, mockInjector, mockNormalizer };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createNavEngine — compute()', () => {
  describe('happy path — HIGH confidence', () => {
    it('returns a valid NavResult with HIGH confidence when |deltaBps| < 100', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      // totalAssets = 10_000_000, AAVE value = 9_990_000
      // delta = -10_000, deltaBps = (-10_000 * 10_000) / 10_000_000 = -10 → |10| < 100 → HIGH
      const rawReads = makeRawReads({ totalAssets: '10000000', aaveRaw: '999000000000' });
      const snapshots = makeSnapshots({ totalAssets: '10000000', aaveValueUsdc: '9990000' });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      expect(result.confidence).toBe(Confidence.HIGH);
      expect(result.recommendedNav).toBe('9990000');         // AAVE + GMX(0)
      expect(result.currentOnChainNav).toBe('10000000');
      expect(result.delta).toBe('-10000');
      expect(result.deltaBps).toBe('-10');
      expect(result.pendingDeposits).toBe('0');
      expect(result.pendingRedemptions).toBe('0');
      expect(result.pendingRedemptionShares).toBe('0');
      expect(typeof result.calculatedAt).toBe('string');
      expect(result.blockNumber).toBe(BLOCK);
    });

    it('breakdown contains entries for each protocol with correct pct', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      // AAVE = 6_000_000, GMX = 4_000_000 → nav = 10_000_000
      const rawReads = makeRawReads({ totalAssets: '10000000', aaveRaw: '600000000000', gmxRaw: '2' });
      const snapshots = makeSnapshots({ totalAssets: '10000000', aaveValueUsdc: '6000000', gmxValueUsdc: '4000000' });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      expect(result.recommendedNav).toBe('10000000');

      const aaveEntry = result.breakdown.find((b) => b.protocol === Protocol.AAVE_V3);
      const gmxEntry = result.breakdown.find((b) => b.protocol === Protocol.GMX_V2);

      expect(aaveEntry).toBeDefined();
      expect(aaveEntry?.valueUsdc).toBe('6000000');
      expect(aaveEntry?.pct).toBe('6000');   // 60% = 6000 bps

      expect(gmxEntry).toBeDefined();
      expect(gmxEntry?.valueUsdc).toBe('4000000');
      expect(gmxEntry?.pct).toBe('4000');    // 40% = 4000 bps
    });

    it('all output financial values are strings', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      const rawReads = makeRawReads({ totalAssets: '10000000', aaveRaw: '999000000000' });
      const snapshots = makeSnapshots({ totalAssets: '10000000', aaveValueUsdc: '9990000' });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      expect(typeof result.recommendedNav).toBe('string');
      expect(typeof result.currentOnChainNav).toBe('string');
      expect(typeof result.delta).toBe('string');
      expect(typeof result.deltaBps).toBe('string');
      expect(typeof result.pendingDeposits).toBe('string');
      expect(typeof result.pendingRedemptions).toBe('string');
      expect(typeof result.pendingRedemptionShares).toBe('string');
    });
  });

  describe('MEDIUM confidence', () => {
    it('returns MEDIUM when 100 <= |deltaBps| < 500', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      // currentOnChainNav = 10_000_000, recommendedNav = 9_505_000
      // delta = -495_000, deltaBps = -495 → |495| in [100, 500) → MEDIUM
      const rawReads = makeRawReads({ totalAssets: '10000000', aaveRaw: '950500000000' });
      const snapshots = makeSnapshots({ totalAssets: '10000000', aaveValueUsdc: '9505000' });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      expect(result.confidence).toBe(Confidence.MEDIUM);
      expect(result.deltaBps).toBe('-495');
    });
  });

  describe('LOW confidence', () => {
    it('returns LOW when |deltaBps| >= 500', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      // currentOnChainNav = 10_000_000, recommendedNav = 9_000_000
      // delta = -1_000_000, deltaBps = -1000 → |1000| >= 500 → LOW
      const rawReads = makeRawReads({ totalAssets: '10000000', aaveRaw: '900000000000' });
      const snapshots = makeSnapshots({ totalAssets: '10000000', aaveValueUsdc: '9000000' });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      expect(result.confidence).toBe(Confidence.LOW);
      expect(result.deltaBps).toBe('-1000');
    });

    it('returns LOW when deltaBps is exactly 500', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      // deltaBps = (500_000 * 10_000) / 10_000_000 = 500 → LOW
      const rawReads = makeRawReads({ totalAssets: '10000000', aaveRaw: '1050000000000' });
      const snapshots = makeSnapshots({ totalAssets: '10000000', aaveValueUsdc: '10500000' });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      expect(result.confidence).toBe(Confidence.LOW);
    });
  });

  describe('pending flows', () => {
    it('pendingDeposits is present but NOT added to recommendedNav', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      const rawReads = makeRawReads({
        totalAssets: '10000000',
        aaveRaw: '999000000000',
        pendingDeposits: '500000',   // 0.5 USDC pending deposit
      });
      const snapshots = makeSnapshots({
        totalAssets: '10000000',
        aaveValueUsdc: '9990000',
        pendingDeposits: '500000',
      });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      // recommendedNav must NOT include pendingDeposits
      expect(result.recommendedNav).toBe('9990000');
      expect(result.pendingDeposits).toBe('500000');
    });

    it('pendingRedemptions is present but NOT added to recommendedNav', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      // 1 share (1e18) pending, sharePrice = 1_000_000 (1 USDC)
      // pendingRedemptions USDC = (1e18 * 1_000_000) / 1e18 = 1_000_000
      const rawReads = makeRawReads({
        totalAssets: '10000000',
        aaveRaw: '999000000000',
        pendingRedemptionShares: '1000000000000000000',
        sharePrice: '1000000',
      });
      const snapshots = makeSnapshots({
        totalAssets: '10000000',
        aaveValueUsdc: '9990000',
        pendingRedemptionShares: '1000000000000000000',
        sharePrice: '1000000',
      });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      // recommendedNav must NOT include pending redemptions
      expect(result.recommendedNav).toBe('9990000');
      expect(result.pendingRedemptionShares).toBe('1000000000000000000');
      expect(result.pendingRedemptions).toBe('1000000');  // USDC value
    });
  });

  describe('zero-value protocol positions', () => {
    it('handles zero GMX position gracefully — pct is 0', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      const rawReads = makeRawReads({ totalAssets: '10000000', aaveRaw: '999000000000', gmxRaw: '0' });
      const snapshots = makeSnapshots({ totalAssets: '10000000', aaveValueUsdc: '9990000', gmxValueUsdc: '0' });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      const gmxEntry = result.breakdown.find((b) => b.protocol === Protocol.GMX_V2);
      expect(gmxEntry).toBeDefined();
      expect(gmxEntry?.valueUsdc).toBe('0');
      expect(gmxEntry?.pct).toBe('0');
    });

    it('handles all-zero positions (empty vault) without crashing', async () => {
      const { mockRegistry, mockInjector, mockNormalizer } = makeMocks();

      const rawReads = makeRawReads({ totalAssets: '0', aaveRaw: '0', gmxRaw: '0' });
      const snapshots = makeSnapshots({ totalAssets: '0', aaveValueUsdc: '0', gmxValueUsdc: '0' });

      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);
      vi.mocked(mockNormalizer.normalize).mockReturnValue(snapshots);

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      const result = await engine.compute(VAULT_ADDRESS);

      expect(result.recommendedNav).toBe('0');
      expect(result.currentOnChainNav).toBe('0');
      expect(result.delta).toBe('0');
      expect(result.deltaBps).toBe('0');  // guarded divide-by-zero
    });
  });

  describe('error handling', () => {
    it('throws NavEngineError with VAULT_NOT_FOUND when vault is unknown', async () => {
      const { mockInjector, mockNormalizer } = makeMocks();
      const mockRegistry: Registry = {
        getVaultConfig: vi.fn().mockReturnValue(undefined),
        listVaults: vi.fn().mockReturnValue([]),
      };

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      await expect(engine.compute('0xunknown')).rejects.toMatchObject({
        code: 'VAULT_NOT_FOUND',
      });
    });

    it('throws NavEngineError with INJECTOR_ERROR when fetchAll rejects', async () => {
      const { mockRegistry, mockNormalizer } = makeMocks();
      const mockInjector: LagoonInjector = {
        fetchAll: vi.fn().mockRejectedValue(new Error('RPC timeout')),
      };

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      await expect(engine.compute(VAULT_ADDRESS)).rejects.toMatchObject({
        code: 'INJECTOR_ERROR',
      });
    });

    it('throws NavEngineError with NORMALIZER_ERROR when normalize throws', async () => {
      const { mockRegistry, mockInjector } = makeMocks();

      const rawReads = makeRawReads({ totalAssets: '10000000', aaveRaw: '999000000000' });
      vi.mocked(mockInjector.fetchAll).mockResolvedValue(rawReads);

      const mockNormalizer: Normalizer = {
        normalize: vi.fn().mockImplementation(() => { throw new Error('bad input'); }),
      };

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      await expect(engine.compute(VAULT_ADDRESS)).rejects.toMatchObject({
        code: 'NORMALIZER_ERROR',
      });
    });

    it('NavEngineError has correct name and code properties', async () => {
      const { mockInjector, mockNormalizer } = makeMocks();
      const mockRegistry: Registry = {
        getVaultConfig: vi.fn().mockReturnValue(undefined),
        listVaults: vi.fn().mockReturnValue([]),
      };

      const engine = createNavEngine({
        registry: mockRegistry,
        injector: mockInjector,
        normalizer: mockNormalizer,
      });

      try {
        await engine.compute('0xunknown');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NavEngineError);
        if (err instanceof NavEngineError) {
          expect(err.name).toBe('NavEngineError');
          expect(err.code).toBe('VAULT_NOT_FOUND');
        }
      }
    });
  });
});
