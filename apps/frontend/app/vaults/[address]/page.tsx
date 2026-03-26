"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getLatestNav, triggerNav } from "@/lib/api/vaults";
import { BalanceBreakdown } from "@/components/nav/BalanceBreakdown";
import { formatNav } from "@/lib/formatNav";
import Link from "next/link";

interface Props {
  params: { address: string };
}

function VaultDetailClient({ address }: { address: string }) {
  const router = useRouter();

  const { data: snapshot, isLoading, error } = useQuery({
    queryKey: ["nav", "latest", address],
    queryFn: () => getLatestNav(address),
  });

  const mutation = useMutation({
    mutationFn: () => triggerNav(address),
    onSuccess: (data) => {
      router.push(`/jobs/${data.jobId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-48 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">No NAV data found for this vault.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {snapshot && (
        <>
          {!snapshot.finalized && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 inline-flex items-center gap-2">
              <span className="text-xs font-medium text-yellow-800">
                Unfinalized — snapshot is pending confirmation
              </span>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total NAV</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatNav(snapshot.totalNav, 18)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Share Price</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatNav(snapshot.sharePrice, 18)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  snapshot.finalized
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {snapshot.finalized ? "Finalized" : "Pending"}
              </span>
              <span className="text-xs text-gray-500">
                Block: {snapshot.blockNumber}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(snapshot.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Balance Breakdown
            </h2>
            <BalanceBreakdown items={snapshot.balanceSnapshots ?? []} />
          </div>
        </>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Triggering..." : "Trigger NAV Calculation"}
      </button>

      {mutation.isError && (
        <p className="text-sm text-red-600 mt-2">
          Failed to trigger NAV calculation.
        </p>
      )}
    </div>
  );
}

export default function VaultPage({ params }: Props) {
  const { address } = params;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/vaults" className="text-sm text-blue-600 hover:underline">
          ← Vaults
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm font-mono text-gray-700 truncate">{address}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vault Detail</h1>
        <div className="flex gap-2">
          <Link
            href={`/vaults/${address}/history`}
            className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            History
          </Link>
          <Link
            href={`/vaults/${address}/allocations`}
            className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            Allocations
          </Link>
        </div>
      </div>

      <VaultDetailClient address={address} />
    </div>
  );
}
