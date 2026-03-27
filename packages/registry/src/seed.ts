import { AaveV3Avalanche } from '@bgd-labs/aave-address-book';
import { Protocol, type VaultConfig } from '@nav-reconciliation/shared';

const AVALANCHE_CHAIN_ID = 43114;

// GMX V2 Reader on Avalanche C-Chain
const GMX_V2_READER_AVALANCHE = '0x0F010009e875B68dce23d93f5db3E06d3b812E9d';

export const LAGOON_VAULT_AVALANCHE: VaultConfig = {
  address: '0x3048925b3ea5a8c12eecccb8810f5f7544db54af',
  chainId: AVALANCHE_CHAIN_ID,
  underlyingToken: AaveV3Avalanche.ASSETS.USDC.UNDERLYING.toLowerCase(),
  underlyingDecimals: 6,
  standard: 'ERC-7540',
  protocols: [
    {
      protocol: Protocol.AAVE_V3,
      chainId: AVALANCHE_CHAIN_ID,
      contractAddress: AaveV3Avalanche.POOL,
    },
    {
      protocol: Protocol.GMX_V2,
      chainId: AVALANCHE_CHAIN_ID,
      contractAddress: GMX_V2_READER_AVALANCHE,
    },
  ],
};

export const SEED_VAULTS: readonly VaultConfig[] = [LAGOON_VAULT_AVALANCHE];
