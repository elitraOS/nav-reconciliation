"use client";

import { useQuery } from "@tanstack/react-query";
import { getNavHistory } from "@/lib/api/vaults";
import { NavHistoryChart } from "./NavHistoryChart";
import Link from "next/link";

interface VaultHistoryProps {
  address: string;
}

export function VaultHistory({ address }: VaultHistoryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["nav", "history", address],
    queryFn: () => getNavHistory(address, { limit: 50 }),
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/vaults/${address}`} className="text-sm text-blue-600 hover:underline">
          ← Vault Detail
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700">History</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">NAV History</h1>

      {isLoading && (
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
      )}

      {error && (
        <p className="text-sm text-red-600">Failed to load history.</p>
      )}

      {data && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <NavHistoryChart data={data.data} />
          <p className="mt-2 text-xs text-gray-400 text-right">
            Showing {data.data.length} of {data.total} snapshots
          </p>
        </div>
      )}
    </div>
  );
}
