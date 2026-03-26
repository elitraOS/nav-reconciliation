import type { IProtocolInjector, BalanceSnapshot } from '@nav/shared';
import { Chain, Protocol } from '@nav/shared';

// Placeholder implementation — full protocol logic is out of scope
export class StubInjector implements IProtocolInjector {
  readonly protocol = Protocol.Aave;
  readonly supportedChains: readonly Chain[] = [Chain.Ethereum];

  async fetchBalances(
    _vaultAddress: string,
    _blockNumber: bigint,
  ): Promise<BalanceSnapshot[]> {
    return [];
  }
}

export type { IProtocolInjector, BalanceSnapshot };
