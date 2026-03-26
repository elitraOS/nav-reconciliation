"use client";

import { useQuery } from "@tanstack/react-query";
import { getNavHistory } from "@/lib/api/vaults";
import { NavHistoryChart } from "@/components/nav/NavHistoryChart";
import Link from "next/link";

interface Props {
  params: { address: string };
}

function NavHistoryClient({ address }: { address: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["nav", "history", address],
    queryFn: () => getNavHistory(address, { page: 1, limit: 50 }),
  });

  if (isLoading) {
    return <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">Failed to load NAV history.</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <NavHistoryChart data={data.data} />
      <p className="mt-2 text-xs text-gray-400 text-right">
        Page {data.page} — showing {data.data.length} of {data.total} snapshots
      </p>
    </div>
  );
}

export default function NavHistoryPage({ params }: Props) {
  const { address } = params;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/vaults/${address}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Vault Detail
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700">History</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">NAV History</h1>

      <NavHistoryClient address={address} />
    </div>
  );
}
