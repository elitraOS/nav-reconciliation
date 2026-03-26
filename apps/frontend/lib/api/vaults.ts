import { apiFetch } from './client';
import {
  NavSnapshotSchema,
  TriggerNavResponseSchema,
  NavHistoryResponseSchema,
  NavSnapshot,
  TriggerNavResponse,
  NavHistoryResponse,
} from './types';
import { z } from 'zod';

export async function triggerNav(address: string): Promise<TriggerNavResponse> {
  return apiFetch(
    `/vaults/${address}/nav`,
    TriggerNavResponseSchema,
    { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } },
  );
}

export async function getLatestNav(address: string): Promise<NavSnapshot> {
  return apiFetch(`/vaults/${address}/nav/latest`, NavSnapshotSchema);
}

export async function getNavHistory(
  address: string,
  params?: { page?: number; limit?: number; from?: string; to?: string; finalizedOnly?: boolean },
): Promise<NavHistoryResponse> {
  const query = new URLSearchParams();
  if (params?.page != null) query.set('page', String(params.page));
  if (params?.limit != null) query.set('limit', String(params.limit));
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.finalizedOnly != null) query.set('finalizedOnly', String(params.finalizedOnly));

  const qs = query.toString();
  return apiFetch(
    `/vaults/${address}/nav/history${qs ? `?${qs}` : ''}`,
    NavHistoryResponseSchema,
  );
}
