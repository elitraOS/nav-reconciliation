import { PrismaClient } from '@prisma/client';
import type { NavResult } from '@nav-reconciliation/shared';

const prisma = new PrismaClient();

export async function saveNavSnapshot(vaultAddress: string, result: NavResult): Promise<void> {
  await prisma.navSnapshot.create({
    data: {
      vaultAddress,
      recommendedNav: result.recommendedNav,
      currentOnChainNav: result.currentOnChainNav,
      delta: result.delta,
      deltaBps: result.deltaBps,
      pendingDeposits: result.pendingDeposits,
      pendingRedemptions: result.pendingRedemptions,
      pendingRedemptionShares: result.pendingRedemptionShares,
      confidence: result.confidence,
      blockNumber: result.blockNumber,
      calculatedAt: result.calculatedAt,
      breakdown: result.breakdown as unknown as object,
    },
  });
}

export async function getLatestNavSnapshot(vaultAddress: string): Promise<NavResult | null> {
  const snapshot = await prisma.navSnapshot.findFirst({
    where: { vaultAddress },
    orderBy: { createdAt: 'desc' },
  });

  if (!snapshot) return null;

  return {
    recommendedNav: snapshot.recommendedNav,
    currentOnChainNav: snapshot.currentOnChainNav,
    delta: snapshot.delta,
    deltaBps: snapshot.deltaBps,
    pendingDeposits: snapshot.pendingDeposits,
    pendingRedemptions: snapshot.pendingRedemptions,
    pendingRedemptionShares: snapshot.pendingRedemptionShares,
    confidence: snapshot.confidence as NavResult['confidence'],
    blockNumber: snapshot.blockNumber,
    calculatedAt: snapshot.calculatedAt,
    breakdown: snapshot.breakdown as NavResult['breakdown'],
  };
}

export interface NavSnapshotPage {
  data: NavResult[];
  total: number;
  page: number;
  limit: number;
}

export async function getNavHistory(
  vaultAddress: string,
  page: number,
  limit: number,
): Promise<NavSnapshotPage> {
  const skip = (page - 1) * limit;

  const [snapshots, total] = await Promise.all([
    prisma.navSnapshot.findMany({
      where: { vaultAddress },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.navSnapshot.count({ where: { vaultAddress } }),
  ]);

  type SnapshotRow = (typeof snapshots)[number];
  const data: NavResult[] = snapshots.map((snapshot: SnapshotRow) => ({
    recommendedNav: snapshot.recommendedNav,
    currentOnChainNav: snapshot.currentOnChainNav,
    delta: snapshot.delta,
    deltaBps: snapshot.deltaBps,
    pendingDeposits: snapshot.pendingDeposits,
    pendingRedemptions: snapshot.pendingRedemptions,
    pendingRedemptionShares: snapshot.pendingRedemptionShares,
    confidence: snapshot.confidence as NavResult['confidence'],
    blockNumber: snapshot.blockNumber,
    calculatedAt: snapshot.calculatedAt,
    breakdown: snapshot.breakdown as NavResult['breakdown'],
  }));

  return { data, total, page, limit };
}
