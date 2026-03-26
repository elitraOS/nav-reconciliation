import { describe, it, expect } from 'vitest';
import { AaveV3Avalanche } from '@bgd-labs/aave-address-book';
import { Protocol, VaultConfigSchema } from '@nav-reconciliation/shared';
import { createRegistry } from '../registry.js';

describe('createRegistry', () => {
  it('returns a pre-seeded registry with the Lagoon vault', () => {
    const registry = createRegistry();
    const vaults = registry.listVaults();
    expect(vaults.length).toBeGreaterThanOrEqual(1);
  });

  it('returns undefined for an unknown vault address', () => {
    const registry = createRegistry();
    expect(registry.getVaultConfig('0x0000000000000000000000000000000000000000')).toBeUndefined();
  });

  it('looks up known vault by lowercase address', () => {
    const registry = createRegistry();
    const config = registry.getVaultConfig('0x3048925b3ea5a8c12eecccb8810f5f7544db54af');
    expect(config).toBeDefined();
  });

  it('looks up known vault by checksummed address (case-insensitive)', () => {
    const registry = createRegistry();
    const config = registry.getVaultConfig('0x3048925B3EA5A8C12EECCCB8810F5F7544DB54AF');
    expect(config).toBeDefined();
  });

  it('getVaultConfig returns config with AAVE_V3 and GMX_V2 protocols', () => {
    const registry = createRegistry();
    const config = registry.getVaultConfig('0x3048925b3ea5a8c12eecccb8810f5f7544db54af');
    expect(config).toBeDefined();

    const protocols = config!.protocols.map((p) => p.protocol);
    expect(protocols).toContain(Protocol.AAVE_V3);
    expect(protocols).toContain(Protocol.GMX_V2);
  });

  it('uses AaveV3Avalanche.POOL for the Aave V3 protocol address (no hardcoded 0x794a...)', () => {
    const registry = createRegistry();
    const config = registry.getVaultConfig('0x3048925b3ea5a8c12eecccb8810f5f7544db54af');
    const aaveAlloc = config!.protocols.find((p) => p.protocol === Protocol.AAVE_V3);
    expect(aaveAlloc).toBeDefined();
    expect(aaveAlloc!.contractAddress).toBe(AaveV3Avalanche.POOL);
  });

  it('VaultConfig validates against VaultConfigSchema', () => {
    const registry = createRegistry();
    const config = registry.getVaultConfig('0x3048925b3ea5a8c12eecccb8810f5f7544db54af');
    expect(config).toBeDefined();
    expect(() => VaultConfigSchema.parse(config)).not.toThrow();
  });

  it('listVaults returns all seeded vaults', () => {
    const registry = createRegistry();
    const vaults = registry.listVaults();
    const addresses = vaults.map((v) => v.address);
    expect(addresses).toContain('0x3048925b3ea5a8c12eecccb8810f5f7544db54af');
  });
});
