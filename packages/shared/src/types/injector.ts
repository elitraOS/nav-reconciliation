import { z } from 'zod';
import { Protocol } from './enums.js';

export const RawPositionReadSchema = z.object({
  protocol: z.nativeEnum(Protocol),
  contractAddress: z.string(),
  method: z.string(),
  rawValue: z.string(),
  decimals: z.number(),
  blockNumber: z.string(),
});

export type RawPositionRead = z.infer<typeof RawPositionReadSchema>;

export const BalanceSnapshotSchema = z.object({
  address: z.string(),
  protocol: z.nativeEnum(Protocol),
  rawValue: z.string(),
  decimals: z.number(),
  blockNumber: z.string(),
  timestamp: z.number(),
});

export type BalanceSnapshot = z.infer<typeof BalanceSnapshotSchema>;
