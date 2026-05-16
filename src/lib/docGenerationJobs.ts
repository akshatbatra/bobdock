export type DocGenerationStatus = 'queued' | 'running' | 'completed' | 'failed';

export type DocGenerationJob = {
  id: string;
  repoUrl: string;
  githubUsername: string;
  githubToken?: string;
  bobAgentJobId: string;
  bobAgentRequestId?: string;
  bobAgentAttempts: number;
  status: DocGenerationStatus;
  error?: string;
  outputTail?: string;
  errorTail?: string;
  exitCode?: number;
  signal?: string;
  docsUrl?: string;
  projectId?: string;
  projectTitle?: string;
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, DocGenerationJob>();
const jobTtlMs = 60 * 60 * 1000;

export function createDocGenerationJob(input: {
  repoUrl: string;
  githubUsername: string;
  githubToken?: string;
  bobAgentJobId: string;
  bobAgentRequestId?: string;
}) {
  const now = new Date().toISOString();
  const job: DocGenerationJob = {
    id: createJobId(),
    repoUrl: input.repoUrl,
    githubUsername: input.githubUsername,
    githubToken: input.githubToken,
    bobAgentJobId: input.bobAgentJobId,
    bobAgentRequestId: input.bobAgentRequestId,
    bobAgentAttempts: 1,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.id, job);
  cleanupJobs();

  return job;
}

export function getDocGenerationJob(jobId: string) {
  cleanupJobs();
  return jobs.get(jobId);
}

export function updateDocGenerationJob(jobId: string, update: Partial<DocGenerationJob>) {
  const job = jobs.get(jobId);

  if (!job) {
    return undefined;
  }

  Object.assign(job, update, {
    updatedAt: new Date().toISOString(),
  });

  return job;
}

function createJobId() {
  return `docs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanupJobs() {
  const cutoff = Date.now() - jobTtlMs;

  for (const [jobId, job] of jobs.entries()) {
    if (Date.parse(job.updatedAt) < cutoff) {
      jobs.delete(jobId);
    }
  }
}
