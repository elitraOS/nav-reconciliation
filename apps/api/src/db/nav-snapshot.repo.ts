import { PrismaClient } from '@prisma/client';
import type { NavResult } from '@nav-reconciliation/shared';

export function createNavSnapshotRepo(prisma: PrismaClient) {
  return {
    async insert(vaultAddress: string, data: NavResult): Promise<void> {
      await prisma.navSnapshot.create({
        data: {
          vaultAddress: vaultAddress.toLowerCase(),
          blockNumber: data.blockNumber,
          recommendedNav: data.recommendedNav,
          currentOnChainNav: data.currentOnChainNav,
          delta: data.delta,
          deltaBps: data.deltaBps,
          breakdown: data.breakdown as unknown as object[],
          pendingDeposits: data.pendingDeposits,
          pendingRedemptions: data.pendingRedemptions,
          pendingRedemptionShares: data.pendingRedemptionShares,
          confidence: data.confidence,
          calculatedAt: data.calculatedAt,
        },
      });
    },

    async latestByAddress(vaultAddress: string) {
      return prisma.navSnapshot.findFirst({
        where: { vaultAddress: vaultAddress.toLowerCase() },
        orderBy: { createdAt: 'desc' },
      });
    },

    async paginatedHistory(vaultAddress: string, page: number, limit: number) {
      const skip = (page - 1) * limit;
      const [data, total] = await prisma.$transaction([
        prisma.navSnapshot.findMany({
          where: { vaultAddress: vaultAddress.toLowerCase() },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.navSnapshot.count({
          where: { vaultAddress: vaultAddress.toLowerCase() },
        }),
      ]);
      return { data, total };
    },
  };
}

export type NavSnapshotRepo = ReturnType<typeof createNavSnapshotRepo>;
