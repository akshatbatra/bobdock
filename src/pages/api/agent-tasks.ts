import type { APIRoute } from 'astro';
import {
  createAgentTaskJob,
  isAgentRole,
  type AgentTaskReference,
} from '../../lib/agentTaskJobs';
import { parseGitHubRepoUrl } from '../../lib/githubDocsStore';

type BobAgentResponse = {
  success: boolean;
  error?: string;
  jobId?: string;
  requestId?: string;
  status?: string;
};

const bobAgentBaseUrl = import.meta.env.BOB_AGENT_BASE_URL;

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const requestId = createRequestId();
  const body = await request.json().catch(() => null);
  const repoUrl = typeof body?.repoUrl === 'string' ? body.repoUrl.trim() : '';
  const githubUsername = typeof body?.githubUsername === 'string' ? body.githubUsername.trim() : '';
  const githubToken = typeof body?.githubToken === 'string' ? body.githubToken.trim() : '';
  const role = typeof body?.role === 'string' ? body.role.trim().toLowerCase() : '';
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const spec = typeof body?.spec === 'string' ? body.spec.trim() : '';
  const references = normalizeReferences(body?.references);

  if (!parseGitHubRepoUrl(repoUrl)) {
    return json({ success: false, error: 'Enter a valid GitHub repository URL.' }, 400);
  }

  if (!isAgentRole(role)) {
    return json({ success: false, error: 'Choose a valid Bob agent.' }, 400);
  }

  if (!title || !spec) {
    return json({ success: false, error: 'Task title and detailed plan are required.' }, 400);
  }

  if (!bobAgentBaseUrl) {
    return json({ success: false, error: 'BOB_AGENT_BASE_URL is not configured.' }, 500);
  }

  const prompt = buildAgentPrompt({
    repoUrl,
    githubUsername,
    role,
    title,
    spec,
    references,
  });

  try {
    const bobAgentResponse = await fetch(`${bobAgentBaseUrl}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const result = (await bobAgentResponse.json()) as BobAgentResponse;

    if (!result.success || !result.jobId) {
      return json(
        {
          success: false,
          error: result.error || 'Bob agent could not start this task.',
          requestId,
          bobAgentRequestId: result.requestId,
        },
        502
      );
    }

    const job = createAgentTaskJob({
      repoUrl,
      githubUsername,
      githubToken,
      role,
      title,
      bobAgentJobId: result.jobId,
      bobAgentRequestId: result.requestId,
    });

    return json({
      success: true,
      jobId: job.id,
      status: job.status,
      requestId,
      bobAgentRequestId: result.requestId,
    }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bob agent task dispatch failed.';
    return json({ success: false, error: message, requestId }, 500);
  }
};

function normalizeReferences(value: unknown): AgentTaskReference[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      title: typeof item?.title === 'string' ? item.title.trim() : '',
      path: typeof item?.path === 'string' ? item.path.trim() : '',
      heading: typeof item?.heading === 'string' ? item.heading.trim() : undefined,
      excerpt: typeof item?.excerpt === 'string' ? item.excerpt.trim() : undefined,
    }))
    .filter((item) => item.title && item.path)
    .slice(0, 12);
}

function buildAgentPrompt(input: {
  repoUrl: string;
  githubUsername: string;
  role: string;
  title: string;
  spec: string;
  references: AgentTaskReference[];
}) {
  const roleInstruction = {
    implementor: 'You are the Implementor agent. Focus on complete, production-quality feature implementation.',
    designer: 'You are the Designer agent. Focus on UI quality, interaction polish, responsive layout, and visual consistency.',
    debugger: 'You are the Debugger agent. Focus on reproducing, isolating, and fixing defects with targeted verification.',
    reviewer: 'You are the Reviewer agent. Focus on finding gaps, regressions, risks, missing tests, and actionable review findings.',
  }[input.role];

  const userContext = input.githubUsername ? `The requesting GitHub username is ${input.githubUsername}.` : '';
  const references = input.references.length
    ? input.references
        .map((ref, index) => {
          const heading = ref.heading ? `#${ref.heading}` : '';
          const excerpt = ref.excerpt ? `\nExcerpt: ${ref.excerpt}` : '';
          return `${index + 1}. ${ref.title} (${ref.path}${heading})${excerpt}`;
        })
        .join('\n')
    : 'No generated documentation references were attached.';

  return `
${roleInstruction} ${userContext}

# TARGET REPOSITORY
${input.repoUrl}

# TASK
${input.title}

# ATTACHED BOBDOCK CONTEXT
${references}

# USER SPEC
${input.spec}

# EXECUTION REQUIREMENTS
- Use the attached Bobdock documentation references as the first source of architectural context.
- Use GitHub and MCP tools available in the cloud environment for repository work.
- Make concrete progress; do not stop after restating a plan.
- Follow the behavior implied by your agent role.
- If code changes are made, commit them or open a pull request according to repository permissions.
- Return a concise completion summary with changed files, verification performed, and any blockers.
`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createRequestId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
