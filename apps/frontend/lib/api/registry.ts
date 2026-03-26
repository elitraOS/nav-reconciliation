import { apiFetch } from './client';
import {
  VaultAllocationSchema,
  VaultAllocation,
  RegisterVaultRequest,
} from './types';
import { z } from 'zod';

export async function registerVaultAllocation(
  data: RegisterVaultRequest,
): Promise<VaultAllocation> {
  return apiFetch('/registry/vaults', VaultAllocationSchema, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getVaultAllocations(address: string): Promise<VaultAllocation[]> {
  return apiFetch(`/registry/vaults/${address}`, z.array(VaultAllocationSchema));
}
