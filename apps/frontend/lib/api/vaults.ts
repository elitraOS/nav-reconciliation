import type { NavResult } from '@nav-reconciliation/shared';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function triggerNavCalc(
  address: string,
): Promise<{ jobId: string }> {
  const res = await fetch(`${API_BASE_URL}/vaults/${address}/nav`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to trigger NAV calc: ${res.status}`);
  return res.json();
}

export async function getLatestNav(
  address: string,
): Promise<NavResult | null> {
  const res = await fetch(`${API_BASE_URL}/vaults/${address}/nav/latest`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch latest NAV: ${res.status}`);
  return res.json();
}

export interface NavHistoryResponse {
  data: NavResult[];
  page: number;
  limit: number;
  total: number;
}

export async function getNavHistory(
  address: string,
  page = 1,
  limit = 50,
): Promise<NavHistoryResponse> {
  const res = await fetch(
    `${API_BASE_URL}/vaults/${address}/nav/history?page=${page}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch NAV history: ${res.status}`);
  return res.json();
}
