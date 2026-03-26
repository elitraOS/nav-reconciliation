"use client";

import { useQuery } from "@tanstack/react-query";
import { getJobStatus } from "@/lib/api/jobs";
import { JobStatusBadge } from "@/components/nav/JobStatusBadge";
import { formatNav } from "@/lib/formatNav";
import Link from "next/link";

interface Props {
  params: { jobId: string };
}

export default function JobStatusPage({ params }: Props) {
  const { jobId } = params;

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJobStatus(jobId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state === "pending" || state === "active") return 2000;
      return false;
    },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/vaults" className="text-sm text-blue-600 hover:underline">
          ← Vaults
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700">Job</span>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Status</h1>
        <JobStatusBadge jobId={jobId} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-500">Job ID</p>
          <p className="font-mono text-sm text-gray-900 mt-1">{jobId}</p>
        </div>

        {isLoading && (
          <div className="animate-pulse h-8 bg-gray-200 rounded" />
        )}

        {job && (
          <>
            {job.progress != null && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Progress</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{job.progress}%</p>
              </div>
            )}

            {job.state === "completed" && job.result && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  NAV Result
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total NAV</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatNav(job.result.totalNav, 18)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Share Price</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {formatNav(job.result.sharePrice, 18)}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/vaults/${job.result.vaultAddress}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View vault →
                  </Link>
                </div>
              </div>
            )}

            {job.state === "failed" && job.failedReason && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-red-700 mb-1">
                  Failure Reason
                </p>
                <p className="text-sm text-red-600 bg-red-50 rounded p-3">
                  {job.failedReason}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
