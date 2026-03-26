import { z } from 'zod';

export const BalanceSnapshotSchema = z.object({
  id: z.string(),
  protocol: z.string(),
  rawValue: z.string(),
  decimals: z.number().int(),
  navSnapshotId: z.string(),
  createdAt: z.string(),
});
export type BalanceSnapshot = z.infer<typeof BalanceSnapshotSchema>;

export const NavSnapshotSchema = z.object({
  id: z.string(),
  vaultAddress: z.string(),
  blockNumber: z.string(),
  totalNav: z.string(),
  sharePrice: z.string(),
  finalized: z.boolean(),
  createdAt: z.string(),
  balanceSnapshots: z.array(BalanceSnapshotSchema).optional(),
});
export type NavSnapshot = z.infer<typeof NavSnapshotSchema>;

export const TriggerNavResponseSchema = z.object({
  jobId: z.string(),
  cached: z.boolean().optional(),
});
export type TriggerNavResponse = z.infer<typeof TriggerNavResponseSchema>;

export const NavHistoryResponseSchema = z.object({
  data: z.array(NavSnapshotSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});
export type NavHistoryResponse = z.infer<typeof NavHistoryResponseSchema>;

export const JobStatusSchema = z.object({
  jobId: z.string(),
  state: z.enum(['pending', 'active', 'completed', 'failed']),
  progress: z.number().optional(),
  result: NavSnapshotSchema.optional(),
  failedReason: z.string().optional(),
});
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const VaultAllocationSchema = z.object({
  id: z.string(),
  vaultAddress: z.string(),
  protocol: z.string(),
  chain: z.string(),
  createdAt: z.string(),
});
export type VaultAllocation = z.infer<typeof VaultAllocationSchema>;

export const RegisterVaultRequestSchema = z.object({
  vaultAddress: z.string(),
  protocol: z.string(),
  chain: z.string(),
});
export type RegisterVaultRequest = z.infer<typeof RegisterVaultRequestSchema>;
