import { createNavEngine } from '@nav-reconciliation/nav-engine';
import type { NavEngine } from '@nav-reconciliation/nav-engine';

let _navEngine: NavEngine | null = null;

export function getNavEngine(): NavEngine {
  if (_navEngine) return _navEngine;

  const rpcUrl = process.env['RPC_URL'];
  if (!rpcUrl) {
    throw new Error('RPC_URL environment variable is required');
  }

  // createNavEngine expects deps: { registry, injector, normalizer }
  // For the service layer we pass the RPC URL as provider; the actual wiring
  // of registry/injector/normalizer happens inside a factory that accepts the provider.
  // Because createNavEngine in this codebase requires the full deps object we
  // need to dynamically construct them. For now we expose a thin wrapper that
  // passes an object with the rpcUrl so consumers can construct real deps.
  throw new Error(
    'getNavEngine: real implementation requires wiring registry/injector/normalizer. ' +
      `Set RPC_URL=${rpcUrl} and provide concrete implementations.`,
  );
}

export function createNavEngineFromProvider(provider: unknown): NavEngine {
  // createNavEngine from the nav-engine package requires { registry, injector, normalizer }.
  // In the API layer we accept any provider object and pass it through.
  return createNavEngine(provider as Parameters<typeof createNavEngine>[0]);
}
