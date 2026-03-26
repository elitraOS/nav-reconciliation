"use client";

import { useQuery } from "@tanstack/react-query";
import { getJobStatus } from "@/lib/api/jobs";
import { JobStatusBadge } from "./JobStatusBadge";
import { formatNav } from "@/lib/formatNav";
import Link from "next/link";

interface JobStatusProps {
  jobId: string;
}

export function JobStatus({ jobId }: JobStatusProps) {
  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", jobId],
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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Status</h1>
        {job && <JobStatusBadge jobId={jobId} />}
      </div>

      {isLoading && (
        <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
      )}

      {job && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Job ID</span>
            <span className="text-sm font-mono text-gray-700">{job.jobId}</span>
          </div>

          {job.progress != null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Progress</span>
                <span className="text-sm text-gray-700">{job.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          )}

          {job.result && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Result</p>
              <p className="text-sm text-gray-500">
                Total NAV:{" "}
                <span className="font-mono text-gray-800">
                  {formatNav(job.result.totalNav, 18)}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                Vault:{" "}
                <Link
                  href={`/vaults/${job.result.vaultAddress}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {job.result.vaultAddress}
                </Link>
              </p>
            </div>
          )}

          {job.failedReason && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-red-600 mb-1">Error</p>
              <p className="text-sm text-red-500">{job.failedReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
