"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLatestNav, triggerNav } from "@/lib/api/vaults";
import { formatNav } from "@/lib/formatNav";
import { BalanceBreakdown } from "./BalanceBreakdown";
import Link from "next/link";

interface VaultDetailProps {
  address: string;
}

export function VaultDetail({ address }: VaultDetailProps) {
  const queryClient = useQueryClient();

  const { data: snapshot, isLoading, error } = useQuery({
    queryKey: ["nav", "latest", address],
    queryFn: () => getLatestNav(address),
  });

  const mutation = useMutation({
    mutationFn: () => triggerNav(address),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nav", "latest", address] });
    },
  });

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
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Triggering..." : "Trigger NAV"}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">No NAV data found for this vault.</p>
        </div>
      )}

      {snapshot && (
        <div className="space-y-6">
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
                Computed: {new Date(snapshot.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Balance Breakdown
            </h2>
            <BalanceBreakdown items={snapshot.balanceSnapshots ?? []} />
          </div>
        </div>
      )}

      {mutation.data?.jobId && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            NAV calculation triggered.{" "}
            <Link
              href={`/jobs/${mutation.data.jobId}`}
              className="font-medium underline"
            >
              Track job {mutation.data.jobId.slice(0, 8)}...
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
