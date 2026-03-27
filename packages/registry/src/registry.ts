import { VaultConfigSchema, type VaultConfig } from '@nav-reconciliation/shared';
import { SEED_VAULTS } from './seed.js';

export interface Registry {
  getVaultConfig(address: string): VaultConfig | undefined;
  listVaults(): VaultConfig[];
}

export function createRegistry(): Registry {
  const store = new Map<string, VaultConfig>();

  for (const config of SEED_VAULTS) {
    const parsed = VaultConfigSchema.parse(config);
    store.set(parsed.address.toLowerCase(), parsed);
  }

  return {
    getVaultConfig(address: string): VaultConfig | undefined {
      return store.get(address.toLowerCase());
    },

    listVaults(): VaultConfig[] {
      return Array.from(store.values());
    },
  };
}
