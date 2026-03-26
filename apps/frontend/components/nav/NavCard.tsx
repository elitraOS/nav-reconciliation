"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLatestNav, triggerNav } from "@/lib/api/vaults";
import { formatNav } from "@/lib/formatNav";
import { JobStatusBadge } from "./JobStatusBadge";
import Link from "next/link";

interface NavCardProps {
  address: string;
}

export function NavCard({ address }: NavCardProps) {
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 font-mono truncate max-w-xs">
            {address}
          </p>
          {snapshot ? (
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNav(snapshot.totalNav, 18)}
            </p>
          ) : (
            <p className="text-gray-400 mt-1">No NAV data</p>
          )}
        </div>
        {snapshot && (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              snapshot.finalized
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {snapshot.finalized ? "Finalized" : "Pending"}
          </span>
        )}
      </div>

      {snapshot && (
        <p className="text-sm text-gray-500 mb-4">
          Share Price:{" "}
          <span className="font-mono text-gray-700">
            {formatNav(snapshot.sharePrice, 18)}
          </span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 mb-4">
          Failed to load NAV data
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? "Triggering..." : "Trigger NAV"}
        </button>

        {mutation.data?.jobId && (
          <Link
            href={`/jobs/${mutation.data.jobId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Job: {mutation.data.jobId.slice(0, 8)}...
          </Link>
        )}

        <Link
          href={`/vaults/${address}/history`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          History →
        </Link>
      </div>
    </div>
  );
}
