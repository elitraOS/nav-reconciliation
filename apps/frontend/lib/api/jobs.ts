import { apiFetch } from './client';
import { JobStatusSchema, JobStatus } from './types';

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return apiFetch(`/jobs/${jobId}`, JobStatusSchema);
}
