import { createNavEngine } from '@nav-reconciliation/nav-engine';
import { createLagoonInjector } from '@nav-reconciliation/injectors';
import { createNormalizer } from '@nav-reconciliation/normalizer';
import { createRegistry } from '@nav-reconciliation/registry';
import type { NavResult } from '@nav-reconciliation/shared';

export async function computeNav(vaultAddress: string, blockNumber: number): Promise<NavResult> {
  const rpcUrl = process.env['AVALANCHE_RPC_URL'] ?? 'http://127.0.0.1:8545';
  const usdcAddress =
    process.env['USDC_ADDRESS'] ?? '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';

  const registry = createRegistry();
  const injector = createLagoonInjector({
    rpcUrl,
    usdcAddress,
    vaultTokenAddress: vaultAddress,
  });
  const normalizer = createNormalizer();
  const engine = createNavEngine({ registry, injector, normalizer });

  return engine.compute(vaultAddress, BigInt(blockNumber));
}
