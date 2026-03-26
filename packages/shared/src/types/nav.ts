import { z } from 'zod';

export const NavResultSchema = z.object({
  vaultAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  blockNumber: z.bigint(),
  timestamp: z.bigint(),
  totalNav: z.bigint(),
  sharePrice: z.bigint(),
  totalSupply: z.bigint(),
  totalAssets: z.bigint(),
  finalized: z.boolean(),
});

export type NavResult = z.infer<typeof NavResultSchema>;
