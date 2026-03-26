import type { NavResult } from '@nav/shared';
import { NavStep } from '@nav/shared';

export interface NavEngineOptions {
  vaultAddress: string;
  blockNumber: bigint;
}

// Placeholder — full NAV calculation pipeline is out of scope
export async function calculateNav(
  _options: NavEngineOptions,
): Promise<NavResult> {
  throw new Error('Not implemented');
}

export { NavStep };
export type { NavResult };
