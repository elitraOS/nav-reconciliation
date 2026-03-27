import { Confidence } from '@nav-reconciliation/shared';

/**
 * Confidence scoring rules:
 * HIGH   — no failures AND |deltaBps| < 100
 * MEDIUM — no failures AND 100 <= |deltaBps| < 500
 * LOW    — any failure OR |deltaBps| >= 500
 */
export function computeConfidence(absDeltaBps: bigint, hadAnyFailure: boolean): Confidence {
  if (hadAnyFailure || absDeltaBps >= 500n) {
    return Confidence.LOW;
  }
  if (absDeltaBps >= 100n) {
    return Confidence.MEDIUM;
  }
  return Confidence.HIGH;
}
