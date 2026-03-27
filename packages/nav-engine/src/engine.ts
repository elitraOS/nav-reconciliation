import { ZodError } from 'zod';
import {
  Protocol,
  NavResultSchema,
  type NavResult,
  type PositionBreakdown,
  type RawPositionRead,
  type BalanceSnapshot,
} from '@nav-reconciliation/shared';
import type { Registry } from '@nav-reconciliation/registry';
import type { LagoonInjector } from '@nav-reconciliation/injectors';
import type { Normalizer } from '@nav-reconciliation/normalizer';
import { NavEngineError } from './errors.js';
import {
  META_METHODS,
  sumPositionValues,
  computeDelta,
  computeDeltaBps,
  computePct,
  computePendingRedemptionsUsdc,
  absValue,
} from './math.js';
import { computeConfidence } from './confidence.js';

export interface NavEngine {
  compute(vaultAddress: string, blockNumber?: bigint): Promise<NavResult>;
}

/** Default USDC price: $1.00 expressed as 8-decimal integer. */
const DEFAULT_USDC_PRICE_8DEC = '100000000';

export function createNavEngine(deps: {
  registry: Registry;
  injector: LagoonInjector;
  normalizer: Normalizer;
}): NavEngine {
  const { registry, injector, normalizer } = deps;

  return {
    async compute(vaultAddress: string, blockNumber?: bigint): Promise<NavResult> {
      // 1. Resolve vault configuration.
      const vaultConfig = registry.getVaultConfig(vaultAddress);
      if (!vaultConfig) {
        throw new NavEngineError(`Vault not found: ${vaultAddress}`, 'VAULT_NOT_FOUND');
      }

      // 2. Fetch raw on-chain reads.
      let rawReads: RawPositionRead[];
      try {
        rawReads = await injector.fetchAll(vaultAddress, blockNumber);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new NavEngineError(`Injector failed: ${msg}`, 'INJECTOR_ERROR');
      }

      // 3. Normalise all reads to USDC 6-decimal snapshots.
      const blockTimestamp = new Date().toISOString();
      let snapshots: BalanceSnapshot[];
      try {
        snapshots = normalizer.normalize(rawReads, {
          usdcPriceUsd: DEFAULT_USDC_PRICE_8DEC,
          blockTimestamp,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new NavEngineError(`Normalizer failed: ${msg}`, 'NORMALIZER_ERROR');
      }

      // 4. Build index-aligned pairs so we can look up method on each snapshot.
      type Pair = { read: RawPositionRead; snapshot: BalanceSnapshot };
      const pairs: Pair[] = rawReads.map((read, i) => {
        const snapshot = snapshots[i];
        if (!snapshot) {
          throw new NavEngineError(`Snapshot missing at index ${i}`, 'NORMALIZER_ERROR');
        }
        return { read, snapshot };
      });

      // 5. Split into meta (vault-level accounting) and investable positions.
      const metaPairs = pairs.filter(({ read }) => META_METHODS.has(read.method));
      const positionPairs = pairs.filter(({ read }) => !META_METHODS.has(read.method));

      // 6. Extract meta values from the raw reads (already in their native decimals).
      const metaRaw = new Map<string, bigint>();
      for (const { read } of metaPairs) {
        metaRaw.set(read.method, BigInt(read.rawValue));
      }

      // 7. Compute recommended NAV as the sum of normalised position values (USDC 6-dec).
      const positionValues = positionPairs.map(({ snapshot }) => BigInt(snapshot.rawValue));
      const recommendedNav = sumPositionValues(positionValues);

      // 8. Pull out accounting meta values.
      const currentOnChainNav = metaRaw.get('totalAssets') ?? 0n;
      const sharePriceRaw = metaRaw.get('sharePrice') ?? 0n;
      const pendingDepositsRaw = metaRaw.get('pendingDeposits') ?? 0n;
      // pendingRedemptions from injector is in vault shares (18-dec).
      const pendingRedemptionShares = metaRaw.get('pendingRedemptions') ?? 0n;
      // Convert share count to USDC value using share price.
      const pendingRedemptionsUsdc = computePendingRedemptionsUsdc(
        pendingRedemptionShares,
        sharePriceRaw,
      );

      // 9. Delta and basis-point deviation.
      const delta = computeDelta(recommendedNav, currentOnChainNav);
      const deltaBps = computeDeltaBps(delta, currentOnChainNav);
      const absDeltaBps = absValue(deltaBps);

      // 10. Confidence — injector throws on failure so hadAnyFailure is always false here.
      const confidence = computeConfidence(absDeltaBps, false);

      // 11. Per-protocol breakdown (aggregate by Protocol enum, exclude meta).
      const byProtocol = new Map<Protocol, bigint>();
      for (const { snapshot } of positionPairs) {
        const current = byProtocol.get(snapshot.protocol) ?? 0n;
        byProtocol.set(snapshot.protocol, current + BigInt(snapshot.rawValue));
      }

      const blockNum =
        rawReads[0]?.blockNumber ??
        (blockNumber !== undefined ? blockNumber.toString() : '0');

      const breakdown: PositionBreakdown[] = [];
      for (const [protocol, valueUsdc] of byProtocol.entries()) {
        breakdown.push({
          protocol,
          valueUsdc: valueUsdc.toString(),
          pct: computePct(valueUsdc, recommendedNav).toString(),
          blockNumber: blockNum,
        });
      }

      // Add IDLE entry: residual cash = totalAssets − external protocol positions.
      const idleValue = currentOnChainNav > recommendedNav ? currentOnChainNav - recommendedNav : 0n;
      breakdown.push({
        protocol: Protocol.IDLE,
        valueUsdc: idleValue.toString(),
        pct: computePct(idleValue, recommendedNav).toString(),
        blockNumber: blockNum,
      });

      // 12. Assemble and schema-validate the NavResult.
      let result: NavResult;
      try {
        result = NavResultSchema.parse({
          recommendedNav: recommendedNav.toString(),
          currentOnChainNav: currentOnChainNav.toString(),
          delta: delta.toString(),
          deltaBps: deltaBps.toString(),
          breakdown,
          pendingDeposits: pendingDepositsRaw.toString(),
          pendingRedemptions: pendingRedemptionsUsdc.toString(),
          pendingRedemptionShares: pendingRedemptionShares.toString(),
          confidence,
          blockNumber: blockNum,
          calculatedAt: blockTimestamp,
        });
      } catch (err) {
        if (err instanceof ZodError) {
          throw new NavEngineError(`NavResult validation failed: ${err.message}`, 'VALIDATION_ERROR');
        }
        throw err;
      }

      return result;
    },
  };
}
