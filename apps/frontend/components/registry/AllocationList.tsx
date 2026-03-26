"use client";

import { useQuery } from "@tanstack/react-query";
import { getVaultAllocations } from "@/lib/api/registry";
import { VaultAllocation } from "@/lib/api/types";

interface AllocationListProps {
  vaultAddress: string;
}

export function AllocationList({ vaultAddress }: AllocationListProps) {
  const { data: allocations, isLoading, error } = useQuery({
    queryKey: ["allocations", vaultAddress],
    queryFn: () => getVaultAllocations(vaultAddress),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600">Failed to load allocations.</p>
    );
  }

  if (!allocations || allocations.length === 0) {
    return (
      <p className="text-sm text-gray-500">No allocations registered yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 text-gray-600 font-medium">Protocol</th>
            <th className="text-left py-2 pr-4 text-gray-600 font-medium">Chain</th>
            <th className="text-left py-2 text-gray-600 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((alloc: VaultAllocation) => (
            <tr key={alloc.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 font-medium text-gray-800">
                {alloc.protocol}
              </td>
              <td className="py-2 pr-4 text-gray-700">{alloc.chain}</td>
              <td className="py-2 text-gray-600 text-xs">
                {new Date(alloc.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
