import type { APIRoute } from 'astro';
import { parseGitHubRepoUrl, readGitHubFile } from '../../lib/githubDocsStore';

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
const testFilePath = 'BOBDOCK_COMMIT_TEST.md';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const requestId = createRequestId();
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId') || '';
  const repoUrl = url.searchParams.get('repoUrl') || '';
  const githubToken = readBearerToken(request);
  const repoPath = parseGitHubRepoUrl(repoUrl);

  if (!jobId) {
    return json({ success: false, status: 'failed', error: 'Missing jobId.', requestId }, 400);
  }

  if (!repoPath) {
    return json({ success: false, status: 'failed', error: 'Missing or invalid repoUrl.', requestId }, 400);
  }

  if (!githubToken) {
    return json({ success: false, status: 'failed', error: 'Missing GitHub token.', requestId }, 400);
  }

  try {
    const bobAgentResponse = await fetch(`${bobAgentBaseUrl}/api/execute/${encodeURIComponent(jobId)}`);

    if (!bobAgentResponse.ok) {
      const responseBody = await bobAgentResponse.text().catch(() => '');

      return json(
        {
          success: false,
          status: 'failed',
          error: responseBody || `Bob agent job status returned ${bobAgentResponse.status}.`,
          requestId,
        },
        502
      );
    }

    const bobAgentJob = (await bobAgentResponse.json()) as BobAgentJobResponse;

    if (bobAgentJob.status === 'queued' || bobAgentJob.status === 'running') {
      return json({
        success: true,
        status: bobAgentJob.status,
        jobId,
        requestId,
        bobAgentRequestId: bobAgentJob.requestId,
      });
    }

    if (!bobAgentJob.success || bobAgentJob.status === 'failed') {
      return json(
        {
          success: false,
          status: 'failed',
          error: bobAgentJob.error || bobAgentJob.output || 'Bob agent could not complete the commit access test.',
          outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
          errorTail: bobAgentJob.errorTail || tail(bobAgentJob.error),
          requestId,
          bobAgentRequestId: bobAgentJob.requestId,
        },
        502
      );
    }

    try {
      const committedFile = await readGitHubFile(repoPath.owner, repoPath.repo, testFilePath, githubToken);

      return json({
        success: true,
        status: 'completed',
        jobId,
        requestId,
        bobAgentRequestId: bobAgentJob.requestId,
        testFilePath,
        fileUrl: `${repoUrl.replace(/\/$/, '')}/blob/HEAD/${testFilePath}`,
        outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
        committedFileTail: tail(committedFile, 1000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Could not verify ${testFilePath}.`;

      return json(
        {
          success: false,
          status: 'failed',
          error: `Bob agent exited successfully, but Bobdock could not verify ${testFilePath} on GitHub: ${message}`,
          outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
          requestId,
          bobAgentRequestId: bobAgentJob.requestId,
        },
        502
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Commit access status check failed.';

    return json({ success: false, status: 'failed', error: message, requestId }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function createRequestId() {
  return `commit-test-status-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function tail(value = '', maxLength = 4000) {
  return value.length > maxLength ? value.slice(-maxLength) : value;
}
