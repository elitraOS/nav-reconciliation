import { createPublicClient, http, type Address, type ContractFunctionParameters } from 'viem';
import { avalanche } from 'viem/chains';
import { AaveV3Avalanche } from '@bgd-labs/aave-address-book';
import { Protocol, type RawPositionRead } from '@nav-reconciliation/shared';
import { InjectorError } from './errors.js';
import { vaultAbi } from './abis/vault.abi.js';
import { erc20Abi } from './abis/erc20.abi.js';
import { aavePoolAbi } from './abis/aave-pool.abi.js';
import { gmxReaderAbi } from './abis/gmx-reader.abi.js';

export interface InjectorConfig {
  /** RPC URL for Avalanche C-Chain. Falls back to process.env.AVALANCHE_RPC_URL */
  rpcUrl?: string;
  /** GMX DataStore address on Avalanche */
  gmxDataStore?: string;
  /** GMX Reader address on Avalanche */
  gmxReader?: string;
  /** USDC contract address on Avalanche */
  usdcAddress: string;
  /** Vault's ERC-20 token address (same as vault for ERC-4626/ERC-7540) */
  vaultTokenAddress: string;
}

export interface LagoonInjector {
  fetchAll(vaultAddress: string, blockNumber?: bigint): Promise<RawPositionRead[]>;
}

export function createLagoonInjector(config: InjectorConfig): LagoonInjector {
  const rpcUrl = config.rpcUrl ?? process.env['AVALANCHE_RPC_URL'];
  if (!rpcUrl) {
    throw new InjectorError(
      'AVALANCHE_RPC_URL is not set and no rpcUrl was provided in config',
      'rpcUrl',
    );
  }

  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(rpcUrl),
  });

  return {
    async fetchAll(vaultAddress: string, blockNumber?: bigint): Promise<RawPositionRead[]> {
      const vault = vaultAddress.toLowerCase() as Address;

      // Step 1: Fetch the pending silo address — cannot be batched on first call
      const pendingSilo = await publicClient.readContract({
        address: vault,
        abi: vaultAbi,
        functionName: 'pendingSilo',
        ...(blockNumber !== undefined ? { blockNumber } : {}),
      });

      // Step 2: Determine the pinned block number for all reads
      let pinnedBlock: bigint;
      if (blockNumber !== undefined) {
        pinnedBlock = blockNumber;
      } else {
        pinnedBlock = await publicClient.getBlockNumber();
      }

      const aavePool = AaveV3Avalanche.POOL as Address;
      const usdc = config.usdcAddress.toLowerCase() as Address;
      const vaultToken = config.vaultTokenAddress.toLowerCase() as Address;

      const hasGmx = Boolean(config.gmxReader && config.gmxDataStore);

      // Step 3: Build multicall batch for all on-chain reads
      const coreContracts = [
        // 0: totalAssets
        {
          address: vault,
          abi: vaultAbi,
          functionName: 'totalAssets',
        },
        // 1: totalSupply
        {
          address: vault,
          abi: vaultAbi,
          functionName: 'totalSupply',
        },
        // 2: sharePrice (convertToAssets(1e18))
        {
          address: vault,
          abi: vaultAbi,
          functionName: 'convertToAssets',
          args: [1000000000000000000n] as const,
        },
        // 3: highWaterMark
        {
          address: vault,
          abi: vaultAbi,
          functionName: 'highWaterMark',
        },
        // 4: pendingDeposits (USDC.balanceOf(pendingSilo))
        {
          address: usdc,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [pendingSilo] as const,
        },
        // 5: pendingRedemptions (VaultToken.balanceOf(pendingSilo))
        {
          address: vaultToken,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [pendingSilo] as const,
        },
        // 6: AAVE_V3 position (getUserAccountData)
        // Returns (totalCollateralBase, totalDebtBase, availableBorrowsBase,
        //          currentLiquidationThreshold, ltv, healthFactor) — all USD/8 decimals (Chainlink base)
        {
          address: aavePool,
          abi: aavePoolAbi,
          functionName: 'getUserAccountData',
          args: [vault] as const,
        },
      ] satisfies ContractFunctionParameters[];

      // 7 (optional): GMX V2 positions
      // Phase A limitation: oracle prices are not passed to getAccountPositions.
      // This means position PnL will not include unrealised mark-to-market gains/losses.
      // A future phase should use a price-aware variant once available on Avalanche.
      const gmxContract: ContractFunctionParameters | null = hasGmx
        ? {
            address: config.gmxReader!.toLowerCase() as Address,
            abi: gmxReaderAbi,
            functionName: 'getAccountPositions',
            args: [
              config.gmxDataStore!.toLowerCase() as Address,
              vault,
              0n,
              100n,
            ] as const,
          }
        : null;

      const contracts: ContractFunctionParameters[] = gmxContract
        ? [...coreContracts, gmxContract]
        : [...coreContracts];

      const results = await publicClient.multicall({
        contracts,
        allowFailure: true,
        blockNumber: pinnedBlock,
      });

      const blockStr = pinnedBlock.toString();

      // Helper to extract a required uint256 result from the multicall
      function requireUint256(index: number, field: string): string {
        const result = results[index];
        if (result === undefined || result.status !== 'success') {
          const reason = result?.status === 'failure' ? String(result.error) : 'missing';
          throw new InjectorError(
            `Multicall failed for required field '${field}': ${reason}`,
            field,
          );
        }
        return (result.result as bigint).toString();
      }

      const reads: RawPositionRead[] = [];

      // totalAssets — USDC, 6 decimals
      reads.push({
        protocol: Protocol.IDLE,
        contractAddress: vault,
        method: 'totalAssets',
        rawValue: requireUint256(0, 'totalAssets'),
        decimals: 6,
        blockNumber: blockStr,
      });

      // totalSupply — vault shares, 18 decimals
      reads.push({
        protocol: Protocol.IDLE,
        contractAddress: vault,
        method: 'totalSupply',
        rawValue: requireUint256(1, 'totalSupply'),
        decimals: 18,
        blockNumber: blockStr,
      });

      // sharePrice — convertToAssets(1e18), result in USDC (6 decimals)
      reads.push({
        protocol: Protocol.IDLE,
        contractAddress: vault,
        method: 'sharePrice',
        rawValue: requireUint256(2, 'sharePrice'),
        decimals: 6,
        blockNumber: blockStr,
      });

      // highWaterMark — 6 decimals
      reads.push({
        protocol: Protocol.IDLE,
        contractAddress: vault,
        method: 'highWaterMark',
        rawValue: requireUint256(3, 'highWaterMark'),
        decimals: 6,
        blockNumber: blockStr,
      });

      // pendingDeposits — USDC.balanceOf(pendingSilo), 6 decimals
      reads.push({
        protocol: Protocol.IDLE,
        contractAddress: usdc,
        method: 'pendingDeposits',
        rawValue: requireUint256(4, 'pendingDeposits'),
        decimals: 6,
        blockNumber: blockStr,
      });

      // pendingRedemptions — VaultToken.balanceOf(pendingSilo), 18 decimals
      reads.push({
        protocol: Protocol.IDLE,
        contractAddress: vaultToken,
        method: 'pendingRedemptions',
        rawValue: requireUint256(5, 'pendingRedemptions'),
        decimals: 18,
        blockNumber: blockStr,
      });

      // AAVE_V3 position — getUserAccountData returns tuple, store totalCollateralBase
      // All values are USD/8 decimals (Chainlink base), NOT USDC
      {
        const aaveResult = results[6];
        if (aaveResult === undefined || aaveResult.status !== 'success') {
          const reason = aaveResult?.status === 'failure' ? String(aaveResult.error) : 'missing';
          throw new InjectorError(
            `Multicall failed for required field 'AAVE_V3': ${reason}`,
            'AAVE_V3',
          );
        }
        const [totalCollateralBase] = aaveResult.result as [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
        ];
        reads.push({
          protocol: Protocol.AAVE_V3,
          contractAddress: aavePool,
          method: 'AAVE_V3',
          rawValue: totalCollateralBase.toString(),
          decimals: 8,
          blockNumber: blockStr,
        });
      }

      // GMX_V2 positions — if configured, store position count
      if (hasGmx) {
        const gmxResult = results[7];
        if (gmxResult === undefined || gmxResult.status !== 'success') {
          // GMX read is optional — return 0 positions rather than throwing
          reads.push({
            protocol: Protocol.GMX_V2,
            contractAddress: config.gmxReader!.toLowerCase(),
            method: 'GMX_V2',
            rawValue: '0',
            decimals: 0,
            blockNumber: blockStr,
          });
        } else {
          // Phase A: store number of open positions.
          // Individual position PnL requires oracle prices which are not available in this batch.
          const positions = gmxResult.result as unknown[];
          reads.push({
            protocol: Protocol.GMX_V2,
            contractAddress: config.gmxReader!.toLowerCase(),
            method: 'GMX_V2',
            rawValue: positions.length.toString(),
            decimals: 0,
            blockNumber: blockStr,
          });
        }
      }

      return reads;
    },
  };
}
