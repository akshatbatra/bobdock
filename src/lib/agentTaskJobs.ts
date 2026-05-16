export type AgentRole = 'implementor' | 'designer' | 'debugger' | 'reviewer';

export type AgentTaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export type AgentTaskReference = {
  title: string;
  path: string;
  heading?: string;
  excerpt?: string;
};

export type AgentTaskJob = {
  id: string;
  repoUrl: string;
  githubUsername: string;
  githubToken?: string;
  role: AgentRole;
  title: string;
  bobAgentJobId: string;
  bobAgentRequestId?: string;
  status: AgentTaskStatus;
  error?: string;
  outputTail?: string;
  errorTail?: string;
  exitCode?: number;
  signal?: string;
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, AgentTaskJob>();
const jobTtlMs = 60 * 60 * 1000;

export function createAgentTaskJob(input: {
  repoUrl: string;
  githubUsername: string;
  githubToken?: string;
  role: AgentRole;
  title: string;
  bobAgentJobId: string;
  bobAgentRequestId?: string;
}) {
  const now = new Date().toISOString();
  const job: AgentTaskJob = {
    id: createJobId(),
    repoUrl: input.repoUrl,
    githubUsername: input.githubUsername,
    githubToken: input.githubToken,
    role: input.role,
    title: input.title,
    bobAgentJobId: input.bobAgentJobId,
    bobAgentRequestId: input.bobAgentRequestId,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.id, job);
  cleanupJobs();

  return job;
}

export function getAgentTaskJob(jobId: string) {
  cleanupJobs();
  return jobs.get(jobId);
}

export function updateAgentTaskJob(jobId: string, update: Partial<AgentTaskJob>) {
  const job = jobs.get(jobId);

  if (!job) {
    return undefined;
  }

  Object.assign(job, update, {
    updatedAt: new Date().toISOString(),
  });

  return job;
}

export function isAgentRole(value: string): value is AgentRole {
  return ['implementor', 'designer', 'debugger', 'reviewer'].includes(value);
}

function createJobId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanupJobs() {
  const cutoff = Date.now() - jobTtlMs;

  for (const [jobId, job] of jobs.entries()) {
    if (Date.parse(job.updatedAt) < cutoff) {
      jobs.delete(jobId);
    }
  }
}
