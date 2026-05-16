import type { APIRoute } from 'astro';
import { getAgentTaskJob, updateAgentTaskJob } from '../../../lib/agentTaskJobs';

type BobAgentJobResponse = {
  success: boolean;
  jobId?: string;
  requestId?: string;
  status?: 'queued' | 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
  errorTail?: string;
  outputTail?: string;
  exitCode?: number;
  signal?: string;
};

const bobAgentBaseUrl = import.meta.env.BOB_AGENT_BASE_URL;

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId') || '';
  const job = getAgentTaskJob(jobId);

  if (!job) {
    return json({
      success: false,
      status: 'failed',
      error: 'Agent task job was not found. It may have expired or the server may have restarted.',
    }, 404);
  }

  if (job.status === 'completed') {
    return json({ success: true, ...toClientJob(job) });
  }

  if (job.status === 'failed') {
    return json({ success: false, ...toClientJob(job) }, 502);
  }

  try {
    const response = await fetch(`${bobAgentBaseUrl}/api/execute/${job.bobAgentJobId}`);

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      const updated = updateAgentTaskJob(job.id, {
        status: 'failed',
        error: responseBody || `Bob agent job status returned ${response.status}.`,
      });

      return json({ success: false, ...toClientJob(updated ?? job) }, 502);
    }

    const bobJob = (await response.json()) as BobAgentJobResponse;
    const status = bobJob.status === 'completed' && bobJob.success ? 'completed' : bobJob.status;

    const updated = updateAgentTaskJob(job.id, {
      status: status ?? 'running',
      error: bobJob.status === 'failed' ? bobJob.error || bobJob.output || 'Bob agent task failed.' : undefined,
      exitCode: bobJob.exitCode,
      signal: bobJob.signal,
      bobAgentRequestId: bobJob.requestId,
      outputTail: bobJob.outputTail || tail(bobJob.output),
      errorTail: bobJob.errorTail || tail(bobJob.error),
    });

    const clientJob = updated ?? job;
    return json({ success: clientJob.status !== 'failed', ...toClientJob(clientJob) }, clientJob.status === 'failed' ? 502 : 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent task status check failed.';
    const updated = updateAgentTaskJob(job.id, {
      status: 'failed',
      error: message,
    });

    return json({ success: false, ...toClientJob(updated ?? job) }, 500);
  }
};

function toClientJob(job: NonNullable<ReturnType<typeof getAgentTaskJob>>) {
  return {
    jobId: job.id,
    status: job.status,
    role: job.role,
    title: job.title,
    error: job.error,
    exitCode: job.exitCode,
    signal: job.signal,
    bobAgentJobId: job.bobAgentJobId,
    bobAgentRequestId: job.bobAgentRequestId,
    outputTail: job.outputTail,
    errorTail: job.errorTail,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function tail(value = '', maxLength = 4000) {
  return value.length > maxLength ? value.slice(-maxLength) : value;
}
