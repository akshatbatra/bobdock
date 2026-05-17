import type { APIRoute } from 'astro';
import { parseGitHubRepoUrl } from '../../lib/githubDocsStore';

type BobAgentResponse = {
  success: boolean;
  error?: string;
  jobId?: string;
  requestId?: string;
  status?: string;
};

const bobAgentBaseUrl = import.meta.env.BOB_AGENT_BASE_URL;
const testFilePath = 'BOBDOCK_COMMIT_TEST.md';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const requestId = createRequestId();
  const body = await request.json().catch(() => null);
  const repoUrl = typeof body?.repoUrl === 'string' ? body.repoUrl.trim() : '';
  const githubUsername = typeof body?.githubUsername === 'string' ? body.githubUsername.trim() : '';
  const githubToken = typeof body?.githubToken === 'string' ? body.githubToken.trim() : '';

  if (!parseGitHubRepoUrl(repoUrl)) {
    return json({ success: false, error: 'Enter a valid GitHub repository URL.', requestId }, 400);
  }

  const prompt = buildCommitTestPrompt(repoUrl, githubUsername);

  try {
    const bobAgentResponse = await fetch(`${bobAgentBaseUrl}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, githubToken }),
    });

    if (!bobAgentResponse.ok) {
      const responseBody = await bobAgentResponse.text().catch(() => '');

      return json(
        {
          success: false,
          error: responseBody || `Bob agent server returned ${bobAgentResponse.status}.`,
          requestId,
        },
        502
      );
    }

    const bobAgentResult = (await bobAgentResponse.json()) as BobAgentResponse;

    if (!bobAgentResult.success || !bobAgentResult.jobId) {
      return json(
        {
          success: false,
          error: bobAgentResult.error || 'Bob agent could not start the commit access test.',
          requestId,
          bobAgentRequestId: bobAgentResult.requestId,
        },
        502
      );
    }

    return json(
      {
        success: true,
        jobId: bobAgentResult.jobId,
        status: bobAgentResult.status || 'queued',
        requestId,
        bobAgentRequestId: bobAgentResult.requestId,
        testFilePath,
      },
      202
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Commit access test failed to start.';

    return json({ success: false, error: message, requestId }, 500);
  }
};

function buildCommitTestPrompt(repoUrl: string, githubUsername: string) {
  const userContext = githubUsername ? `The requesting GitHub username is ${githubUsername}.` : '';
  const timestamp = new Date().toISOString();

  return `
You are running a Bobdock GitHub commit access test. ${userContext}

Repository:
${repoUrl}

Task:
- Use GitHub CLI (gh) and git for all GitHub operations. MCP is not available.
- Authenticate GitHub CLI with GH_TOKEN or GITHUB_TOKEN from the environment.
- Create or update a root-level file named ${testFilePath}.
- The file content must include this exact timestamp: ${timestamp}
- Commit the change to the repository default branch.
- The commit MUST be authored as "Bobdock Agent <agent@bobdock.app>" to identify the agent separately from the user.
- After committing, verify that ${testFilePath} is visible on the repository default branch through GitHub.
- Do not claim success unless the committed file is visible through GitHub.
- If you cannot commit directly because of permissions or branch protection, create a branch and pull request if possible, then report that direct default-branch commit access is blocked.
- If you cannot write to the repository at all, report the exact permission or authentication blocker.

Return a short plain-text summary only.
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

function createRequestId() {
  return `commit-test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
