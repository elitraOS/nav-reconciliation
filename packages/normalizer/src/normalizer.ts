import { ZodError } from 'zod'
import {
  RawPositionRead,
  RawPositionReadSchema,
  BalanceSnapshot,
  BalanceSnapshotSchema,
  Protocol,
} from '@nav-reconciliation/shared'
import { NormalizerError } from './errors.js'
import { convertAaveCollateralToUsdc } from './converters/aave.converter.js'

export interface NormalizerOptions {
  /** USD price of USDC expressed as an 8-decimal integer string (e.g. "100000000" = $1.00) */
  usdcPriceUsd?: string
  /** ISO 8601 timestamp of the pinned block (e.g. "2024-01-01T00:00:00Z") */
  blockTimestamp: string
}

export interface Normalizer {
  normalize(reads: RawPositionRead[], opts: NormalizerOptions): BalanceSnapshot[]
}

export function createNormalizer(): Normalizer {
  return {
    normalize(reads: RawPositionRead[], opts: NormalizerOptions): BalanceSnapshot[] {
      // Convert blockTimestamp ISO string → Unix timestamp (seconds, as number)
      const timestampMs = Date.parse(opts.blockTimestamp)
      if (Number.isNaN(timestampMs)) {
        throw new NormalizerError(
          `Invalid blockTimestamp: ${opts.blockTimestamp}`,
          'blockTimestamp',
          opts.blockTimestamp
        )
      }
      const timestamp = Math.floor(timestampMs / 1000)

      return reads.map((read) => {
        // a. Validate input
        let validated: RawPositionRead
        try {
          validated = RawPositionReadSchema.parse(read)
        } catch (err) {
          if (err instanceof ZodError) {
            const firstIssue = err.issues[0]
            const field = firstIssue ? firstIssue.path.join('.') || 'unknown' : 'unknown'
            throw new NormalizerError(
              `Invalid RawPositionRead: ${firstIssue?.message ?? 'validation failed'}`,
              field,
              read
            )
          }
          throw err
        }

        // b. Dispatch to protocol-specific converter
        let normalizedValue: string
        let normalizedDecimals: number

        if (validated.protocol === Protocol.AAVE_V3) {
          if (!opts.usdcPriceUsd) {
            throw new NormalizerError(
              'usdcPriceUsd is required for AAVE_V3 protocol normalization',
              'usdcPriceUsd',
              undefined
            )
          }
          normalizedValue = convertAaveCollateralToUsdc(validated.rawValue, opts.usdcPriceUsd)
          normalizedDecimals = 6
        } else {
          // Pass-through: rawValue and decimals unchanged
          normalizedValue = validated.rawValue
          normalizedDecimals = validated.decimals
        }

        // c. Build and validate output snapshot
        const snapshot = {
          address: validated.contractAddress,
          protocol: validated.protocol,
          rawValue: normalizedValue,
          decimals: normalizedDecimals,
          blockNumber: validated.blockNumber,
          timestamp,
        }

        try {
          return BalanceSnapshotSchema.parse(snapshot)
        } catch (err) {
          if (err instanceof ZodError) {
            const firstIssue = err.issues[0]
            const field = firstIssue ? firstIssue.path.join('.') || 'unknown' : 'unknown'
            throw new NormalizerError(
              `Invalid BalanceSnapshot output: ${firstIssue?.message ?? 'validation failed'}`,
              field,
              snapshot
            )
          }
          throw err
        }
      })
    },
  }
}
