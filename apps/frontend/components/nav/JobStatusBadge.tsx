"use client";

import { useQuery } from "@tanstack/react-query";
import { getJobStatus } from "@/lib/api/jobs";
import { JobStatus } from "@/lib/api/types";

interface JobStatusBadgeProps {
  jobId: string;
}

const STATUS_STYLES: Record<JobStatus["state"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export function JobStatusBadge({ jobId }: JobStatusBadgeProps) {
  const { data: job } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => getJobStatus(jobId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state === "pending" || state === "active") return 2000;
      return false;
    },
  });

  if (!job) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Loading...
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[job.state]}`}
    >
      {job.state.charAt(0).toUpperCase() + job.state.slice(1)}
    </span>
  );
}
