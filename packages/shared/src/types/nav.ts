import { z } from 'zod';
import { Confidence, Protocol } from './enums.js';

export const PositionBreakdownSchema = z.object({
  protocol: z.nativeEnum(Protocol),
  valueUsdc: z.string(),
  pct: z.string(),
  blockNumber: z.string(),
});

export type PositionBreakdown = z.infer<typeof PositionBreakdownSchema>;

export const NavResultSchema = z.object({
  recommendedNav: z.string(),
  currentOnChainNav: z.string(),
  delta: z.string(),
  deltaBps: z.string(),
  breakdown: z.array(PositionBreakdownSchema),
  pendingDeposits: z.string(),
  pendingRedemptions: z.string(),
  pendingRedemptionShares: z.string(),
  confidence: z.nativeEnum(Confidence),
  blockNumber: z.string(),
  calculatedAt: z.string(),
});

export type NavResult = z.infer<typeof NavResultSchema>;
