import { NormalizerError } from '../errors.js'

/**
 * Convert Aave V3 totalCollateralBase (USD in 8 decimals) to USDC (6 decimals).
 *
 * Formula: (totalCollateralBase * 1_000_000n) / usdcPriceIn8Dec
 *
 * All arithmetic uses BigInt only — no Number(), parseFloat(), or parseInt().
 */
export function convertAaveCollateralToUsdc(
  totalCollateralBase: string,
  usdcPriceIn8Dec: string
): string {
  let collateral: bigint
  let usdcPrice: bigint

  try {
    collateral = BigInt(totalCollateralBase)
  } catch {
    throw new NormalizerError(
      `Cannot parse totalCollateralBase as BigInt: ${totalCollateralBase}`,
      'rawValue',
      totalCollateralBase
    )
  }

  try {
    usdcPrice = BigInt(usdcPriceIn8Dec)
  } catch {
    throw new NormalizerError(
      `Cannot parse usdcPriceIn8Dec as BigInt: ${usdcPriceIn8Dec}`,
      'usdcPriceUsd',
      usdcPriceIn8Dec
    )
  }

  if (usdcPrice === 0n) {
    throw new NormalizerError(
      'usdcPriceIn8Dec must not be zero',
      'usdcPriceUsd',
      usdcPriceIn8Dec
    )
  }

  // Scale up by USDC decimals (6) before dividing by USDC price (8 dec) to
  // keep full integer precision (scale-before-divide pattern).
  const result = (collateral * 1_000_000n) / usdcPrice

  return result.toString()
}
