import type { IProtocolRegistry, VaultAllocation } from '@nav/shared';
import { Protocol } from '@nav/shared';

// Placeholder in-memory registry implementation
export class InMemoryRegistry implements IProtocolRegistry {
  private readonly allocations = new Map<string, VaultAllocation[]>();

  async registerVault(allocation: VaultAllocation): Promise<void> {
    const existing = this.allocations.get(allocation.vaultAddress) ?? [];
    this.allocations.set(allocation.vaultAddress, [...existing, allocation]);
  }

  async getAllocations(vaultAddress: string): Promise<VaultAllocation[]> {
    return this.allocations.get(vaultAddress) ?? [];
  }

  getSupportedProtocols(): Protocol[] {
    return Object.values(Protocol);
  }
}

export type { IProtocolRegistry, VaultAllocation };
