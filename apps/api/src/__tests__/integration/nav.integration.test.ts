import { describe, test, expect } from 'vitest';
import { createNavEngine } from '@nav-reconciliation/nav-engine';
import { createLagoonInjector } from '@nav-reconciliation/injectors';
import { createNormalizer } from '@nav-reconciliation/normalizer';
import { createRegistry } from '@nav-reconciliation/registry';
import { NavResultSchema, Protocol } from '@nav-reconciliation/shared';

// Vault under test: Lagoon ERC-7540 vault on Avalanche C-Chain
const VAULT_ADDRESS = '0x3048925b3ea5a8c12eecccb8810f5f7544db54af';

// Pinned block: Avalanche C-Chain block 55_000_000 (post-Etna, ~Jan 2025)
// Using a fixed block ensures the test is fully deterministic.
const PINNED_BLOCK = 55_000_000n;

// Native USDC on Avalanche C-Chain (6 decimals)
const USDC_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';

// Anvil forks locally on this URL — never uses AVALANCHE_RPC_URL directly in assertions
const ANVIL_RPC_URL = 'http://127.0.0.1:8545';

// Evaluated at module load time, after globalSetup has set env vars
const shouldSkip =
  !process.env['AVALANCHE_RPC_URL'] || process.env['INTEGRATION_TESTS_SKIP'] === 'true';

describe('LagoonInjector → navEngine.compute() (Anvil fork of Avalanche)', () => {
  test.skipIf(shouldSkip)(
    'returns a valid NavResult with positive NAV values at pinned block',
    async () => {
      const registry = createRegistry();
      const injector = createLagoonInjector({
        rpcUrl: ANVIL_RPC_URL,
        usdcAddress: USDC_ADDRESS,
        vaultTokenAddress: VAULT_ADDRESS,
      });
      const normalizer = createNormalizer();
      const navEngine = createNavEngine({ registry, injector, normalizer });

      const result = await navEngine.compute(VAULT_ADDRESS, PINNED_BLOCK);

      // Schema validation — full Zod parse must succeed
      expect(NavResultSchema.safeParse(result).success).toBe(true);

      // Positive NAV values
      expect(BigInt(result.recommendedNav)).toBeGreaterThan(0n);
      expect(BigInt(result.currentOnChainNav)).toBeGreaterThan(0n);

      // All financial value fields must be strings (BigInt-safe representation)
      expect(typeof result.recommendedNav).toBe('string');
      expect(typeof result.currentOnChainNav).toBe('string');
      expect(typeof result.delta).toBe('string');
      expect(typeof result.deltaBps).toBe('string');
      expect(typeof result.pendingDeposits).toBe('string');
      expect(typeof result.pendingRedemptions).toBe('string');
      expect(typeof result.pendingRedemptionShares).toBe('string');
      expect(typeof result.blockNumber).toBe('string');

      // At least one protocol breakdown entry for AAVE_V3 or GMX_V2
      const hasAaveOrGmx = result.breakdown.some(
        (b) => b.protocol === Protocol.AAVE_V3 || b.protocol === Protocol.GMX_V2,
      );
      expect(hasAaveOrGmx).toBe(true);

      // Block number is pinned and deterministic
      expect(result.blockNumber).toBe(String(PINNED_BLOCK));
    },
  );

  test.skipIf(shouldSkip)(
    'produces identical results on repeated calls (determinism)',
    async () => {
      const registry = createRegistry();
      const injector = createLagoonInjector({
        rpcUrl: ANVIL_RPC_URL,
        usdcAddress: USDC_ADDRESS,
        vaultTokenAddress: VAULT_ADDRESS,
      });
      const normalizer = createNormalizer();
      const navEngine = createNavEngine({ registry, injector, normalizer });

      const result1 = await navEngine.compute(VAULT_ADDRESS, PINNED_BLOCK);
      const result2 = await navEngine.compute(VAULT_ADDRESS, PINNED_BLOCK);

      expect(result1.recommendedNav).toBe(result2.recommendedNav);
      expect(result1.currentOnChainNav).toBe(result2.currentOnChainNav);
      expect(result1.blockNumber).toBe(result2.blockNumber);
      expect(result1.breakdown.length).toBe(result2.breakdown.length);
    },
  );
});
