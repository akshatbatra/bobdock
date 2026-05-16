import type { APIRoute } from 'astro';
import { getDocGenerationJob, updateDocGenerationJob } from '../../../lib/docGenerationJobs';
import {
  createProjectDocsUrl,
  parseGitHubRepoUrl,
  readGitHubProjectDoc,
  readGitHubProjectDocs,
} from '../../../lib/githubDocsStore';

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
  const requestId = createRequestId();
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId') || '';
  const job = getDocGenerationJob(jobId);

  if (!job) {
    console.warn(`[${requestId}] Documentation generation status requested for missing job`, {
      jobId,
    });

    return json(
      {
        success: false,
        status: 'failed',
        error: 'Documentation generation job was not found. It may have expired or the server may have restarted.',
        requestId,
      },
      404
    );
  }

  if (job.status === 'completed') {
    return json({ success: true, ...toClientJob(job), requestId });
  }

  if (job.status === 'failed') {
    return json({ success: false, ...toClientJob(job), requestId }, 502);
  }

  try {
    const bobAgentResponse = await fetchWithRetry(`${bobAgentBaseUrl}/api/execute/${job.bobAgentJobId}`);

    if (!bobAgentResponse.ok) {
      const responseBody = await bobAgentResponse.text().catch(() => '');

      console.error(`[${requestId}] Bob agent job status returned an HTTP failure`, {
        jobId: job.id,
        bobAgentJobId: job.bobAgentJobId,
        status: bobAgentResponse.status,
        responseBody: tail(responseBody),
      });

      const updated = updateDocGenerationJob(job.id, {
        status: 'failed',
        error: responseBody || `Bob agent job status returned ${bobAgentResponse.status}.`,
      });

      return json({ success: false, ...toClientJob(updated ?? job), requestId }, 502);
    }

    const bobAgentJob = (await bobAgentResponse.json()) as BobAgentJobResponse;

    if (bobAgentJob.status === 'queued' || bobAgentJob.status === 'running') {
      const updated = updateDocGenerationJob(job.id, {
        status: bobAgentJob.status,
        bobAgentRequestId: bobAgentJob.requestId,
        outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
        errorTail: bobAgentJob.errorTail || tail(bobAgentJob.error),
      });

      return json({ success: true, ...toClientJob(updated ?? job), requestId });
    }

    if (!bobAgentJob.success || bobAgentJob.status === 'failed') {
      console.error(`[${requestId}] Bob agent documentation job failed`, {
        jobId: job.id,
        bobAgentJobId: job.bobAgentJobId,
        bobAgentRequestId: bobAgentJob.requestId,
        exitCode: bobAgentJob.exitCode,
        signal: bobAgentJob.signal,
        errorTail: bobAgentJob.errorTail || tail(bobAgentJob.error),
        outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
      });

      const updated = updateDocGenerationJob(job.id, {
        status: 'failed',
        error: bobAgentJob.error || bobAgentJob.output || 'Bob agent could not generate documentation.',
        exitCode: bobAgentJob.exitCode,
        signal: bobAgentJob.signal,
        bobAgentRequestId: bobAgentJob.requestId,
        outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
        errorTail: bobAgentJob.errorTail || tail(bobAgentJob.error),
      });

      return json({ success: false, ...toClientJob(updated ?? job), requestId }, 502);
    }

    let project;

    try {
      const repoPath = parseGitHubRepoUrl(job.repoUrl);

      if (!repoPath) {
        throw new Error('The repository URL could not be mapped to a Bobdock documentation URL.');
      }

      project = await readGitHubProjectDocs(repoPath.owner, repoPath.repo, job.githubToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load .bobdock documentation from GitHub.';

      console.error(`[${requestId}] Failed to load completed .bobdock documentation`, {
        jobId: job.id,
        bobAgentJobId: job.bobAgentJobId,
        bobAgentRequestId: bobAgentJob.requestId,
        message,
        outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
      });

      const continuation = await continueEarlyJob(job, {
        requestId,
        reason: `Bob agent exited before committed Bobdock docs were visible on GitHub: ${message}`,
        previousOutput: bobAgentJob.outputTail || tail(bobAgentJob.output),
        previousError: bobAgentJob.errorTail || tail(bobAgentJob.error),
      });

      if (continuation) {
        return json({ success: true, ...toClientJob(continuation), requestId });
      }

      const updated = updateDocGenerationJob(job.id, {
        status: 'failed',
        error: `Bob agent completed, but Bobdock could not load .bobdock documentation from GitHub: ${message}`,
        bobAgentRequestId: bobAgentJob.requestId,
        outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
        errorTail: bobAgentJob.errorTail || tail(bobAgentJob.error),
      });

      return json({ success: false, ...toClientJob(updated ?? job), requestId }, 502);
    }

    if (!project.docs.length) {
      console.error(`[${requestId}] Completed .bobdock manifest did not contain documentation files`, {
        jobId: job.id,
        bobAgentJobId: job.bobAgentJobId,
        bobAgentRequestId: bobAgentJob.requestId,
        repoUrl: job.repoUrl,
      });

      const continuation = await continueEarlyJob(job, {
        requestId,
        reason: 'Bob agent exited after creating a manifest with no documentation entries.',
        previousOutput: bobAgentJob.outputTail || tail(bobAgentJob.output),
        previousError: bobAgentJob.errorTail || tail(bobAgentJob.error),
      });

      if (continuation) {
        return json({ success: true, ...toClientJob(continuation), requestId });
      }

      const updated = updateDocGenerationJob(job.id, {
        status: 'failed',
        error: 'The .bobdock manifest did not contain any documentation files.',
        bobAgentRequestId: bobAgentJob.requestId,
        outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
        errorTail: bobAgentJob.errorTail || tail(bobAgentJob.error),
      });

      return json({ success: false, ...toClientJob(updated ?? job), requestId }, 502);
    }

    const missingDocs = await findMissingManifestDocs(project, job.githubToken);

    if (missingDocs.length) {
      console.error(`[${requestId}] Completed .bobdock manifest referenced missing documentation files`, {
        jobId: job.id,
        bobAgentJobId: job.bobAgentJobId,
        bobAgentRequestId: bobAgentJob.requestId,
        repoUrl: job.repoUrl,
        missingDocs,
      });

      const continuation = await continueEarlyJob(job, {
        requestId,
        reason: `Bob agent exited after committing a manifest that references missing documentation files: ${missingDocs.join(', ')}`,
        previousOutput: bobAgentJob.outputTail || tail(bobAgentJob.output),
        previousError: bobAgentJob.errorTail || tail(bobAgentJob.error),
      });

      if (continuation) {
        return json({ success: true, ...toClientJob(continuation), requestId });
      }

      const updated = updateDocGenerationJob(job.id, {
        status: 'failed',
        error: `The .bobdock manifest references missing documentation files: ${missingDocs.join(', ')}`,
        bobAgentRequestId: bobAgentJob.requestId,
        outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
        errorTail: bobAgentJob.errorTail || tail(bobAgentJob.error),
      });

      return json({ success: false, ...toClientJob(updated ?? job), requestId }, 502);
    }

    const docsUrl = createProjectDocsUrl(job.repoUrl);

    const updated = updateDocGenerationJob(job.id, {
      status: 'completed',
      projectId: `${project.owner}/${project.repo}`,
      projectTitle: project.projectTitle,
      docsUrl,
      bobAgentRequestId: bobAgentJob.requestId,
      outputTail: bobAgentJob.outputTail || tail(bobAgentJob.output),
      errorTail: bobAgentJob.errorTail || tail(bobAgentJob.error),
    });

    console.log(`[${requestId}] Documentation generation job completed`, {
      jobId: job.id,
      bobAgentJobId: job.bobAgentJobId,
      bobAgentRequestId: bobAgentJob.requestId,
      projectId: `${project.owner}/${project.repo}`,
      docsCount: project.docs.length,
    });

    return json({ success: true, ...toClientJob(updated ?? job), requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Documentation generation status check failed.';

    console.error(`[${requestId}] Documentation generation status check crashed`, {
      jobId: job.id,
      bobAgentJobId: job.bobAgentJobId,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    const updated = updateDocGenerationJob(job.id, {
      status: 'failed',
      error: message,
    });

    return json({ success: false, ...toClientJob(updated ?? job), requestId }, 500);
  }
};

function toClientJob(job: NonNullable<ReturnType<typeof getDocGenerationJob>>) {
  return {
    jobId: job.id,
    status: job.status,
    error: job.error,
    exitCode: job.exitCode,
    signal: job.signal,
    docsUrl: job.docsUrl,
    projectId: job.projectId,
    projectTitle: job.projectTitle,
    bobAgentJobId: job.bobAgentJobId,
    bobAgentRequestId: job.bobAgentRequestId,
    outputTail: job.outputTail,
    errorTail: job.errorTail,
  };
}

async function findMissingManifestDocs(project: Awaited<ReturnType<typeof readGitHubProjectDocs>>, token?: string) {
  const requiredPaths = Array.from(new Set(['overview.md', ...project.docs.map((doc) => doc.path)]));
  const checks = await Promise.allSettled(
    requiredPaths.map(async (docPath) => {
      await readGitHubProjectDoc(project, docPath, token);
      return docPath;
    })
  );

  return checks.flatMap((result, index) => (result.status === 'rejected' ? [requiredPaths[index]] : []));
}

async function continueEarlyJob(
  job: NonNullable<ReturnType<typeof getDocGenerationJob>>,
  input: {
    requestId: string;
    reason: string;
    previousOutput?: string;
    previousError?: string;
  }
) {
  if (job.bobAgentAttempts >= 2) {
    return undefined;
  }

  console.warn(`[${input.requestId}] Restarting Bob agent documentation job after early exit`, {
    jobId: job.id,
    previousbobAgentJobId: job.bobAgentJobId,
    attempts: job.bobAgentAttempts,
    reason: input.reason,
  });

  const prompt = buildContinuationPrompt(job.repoUrl, job.githubUsername, input);
  const response = await fetch(`${bobAgentBaseUrl}/api/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, githubToken: job.githubToken || '' }),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');

    console.error(`[${input.requestId}] Bob agent continuation start failed`, {
      jobId: job.id,
      status: response.status,
      responseBody: tail(responseBody),
    });

    return undefined;
  }

  const bobAgentResult = (await response.json()) as {
    success: boolean;
    jobId?: string;
    requestId?: string;
    error?: string;
  };

  if (!bobAgentResult.success || !bobAgentResult.jobId) {
    console.error(`[${input.requestId}] Bob agent continuation was rejected`, {
      jobId: job.id,
      error: bobAgentResult.error,
      bobAgentRequestId: bobAgentResult.requestId,
    });

    return undefined;
  }

  return updateDocGenerationJob(job.id, {
    status: 'running',
    error: undefined,
    bobAgentJobId: bobAgentResult.jobId,
    bobAgentRequestId: bobAgentResult.requestId,
    bobAgentAttempts: job.bobAgentAttempts + 1,
    outputTail: `Bob agent exited before committed docs were visible. Restarting with stricter completion instructions.\n\n${input.previousOutput || ''}`,
    errorTail: input.previousError,
  });
}

function buildContinuationPrompt(
  repoUrl: string,
  githubUsername: string,
  input: {
    reason: string;
    previousOutput?: string;
    previousError?: string;
  }
) {
  const userContext = githubUsername ? `The requesting GitHub username is ${githubUsername}.` : '';

  return `
You are continuing a Bobdock documentation generation job that exited too early. ${userContext}

Repository:
${repoUrl}

Previous attempt stopped before Bobdock could verify the committed documentation.
Reason:
${input.reason}

Previous stdout tail:
${input.previousOutput || '(empty)'}

Previous stderr tail:
${input.previousError || '(empty)'}

Finish the job now. Do not only describe the plan.

Required actions:
- Before scanning further, print exactly one progress line beginning with "Bobdock progress:".
- Use GitHub CLI (gh) and git for all GitHub operations. MCP is not available.
- Authenticate GitHub CLI with GH_TOKEN or GITHUB_TOKEN from the environment.
- Inspect the repository enough to document its important structure.
- Create or update .bobdock/manifest.json.
- Create or update real Markdown files under .bobdock/docs, including .bobdock/docs/overview.md.
- Commit the .bobdock changes to the repository default branch.
- Verify through GitHub that .bobdock/manifest.json, .bobdock/docs/overview.md, and every file listed in manifest.json are visible on the default branch.
- Do not exit successfully until those files are committed and visible through GitHub. If a manifest entry points to a file you did not create, either create and commit that file or remove the manifest entry.
- If direct commit is blocked, create a branch and pull request if possible, then report the exact blocker.

Return a short plain-text completion summary only after verification.
`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

async function fetchWithRetry(url: string, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await delay(500 * attempt);
      }
    }
  }

  throw lastError;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createRequestId() {
  return `docs-status-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function tail(value = '', maxLength = 4000) {
  return value.length > maxLength ? value.slice(-maxLength) : value;
}
