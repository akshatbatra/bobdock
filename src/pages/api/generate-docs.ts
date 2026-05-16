import type { APIRoute } from 'astro';
import { createDocGenerationJob } from '../../lib/docGenerationJobs';
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
  const readExistingDocs = body?.readExistingDocs === true;
  const excludeItems = Array.isArray(body?.excludeItems) ? body.excludeItems : [];

  if (!isGitHubRepoUrl(repoUrl)) {
    console.warn(`[${requestId}] Documentation generation rejected: invalid GitHub repository URL`, {
      repoUrl,
    });
    return json({ success: false, error: 'Enter a valid GitHub repository URL.' }, 400);
  }

  const prompt = buildDocumentationPrompt(repoUrl, githubUsername, readExistingDocs, excludeItems);

  try {
    console.log(`[${requestId}] Starting documentation generation`, {
      repoUrl,
      githubUsername,
      bobAgentBaseUrl,
      promptLength: prompt.length,
    });

    const bobAgentResponse = await fetch(`${bobAgentBaseUrl}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, githubToken }),
    });

    if (!bobAgentResponse.ok) {
      const responseBody = await bobAgentResponse.text().catch(() => '');

      console.error(`[${requestId}] Bob agent server returned an HTTP failure`, {
        status: bobAgentResponse.status,
        statusText: bobAgentResponse.statusText,
        responseBody: tail(responseBody),
      });

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
      console.error(`[${requestId}] Bob agent job start failed`, {
        bobAgentRequestId: bobAgentResult.requestId,
        error: bobAgentResult.error,
      });

      return json(
        {
          success: false,
          error: bobAgentResult.error || 'Bob agent could not start documentation generation.',
          requestId,
          bobAgentRequestId: bobAgentResult.requestId,
        },
        502
      );
    }

    const job = createDocGenerationJob({
      repoUrl,
      githubUsername,
      githubToken,
      bobAgentJobId: bobAgentResult.jobId,
      bobAgentRequestId: bobAgentResult.requestId,
    });

    console.log(`[${requestId}] Documentation generation job started`, {
      bobAgentRequestId: bobAgentResult.requestId,
      bobAgentJobId: bobAgentResult.jobId,
      jobId: job.id,
    });

    return json({
      success: true,
      jobId: job.id,
      status: job.status,
      requestId,
      bobAgentRequestId: bobAgentResult.requestId,
    }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Documentation generation failed.';

    console.error(`[${requestId}] Documentation generation crashed`, {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return json({ success: false, error: message, requestId }, 500);
  }
};

function isGitHubRepoUrl(repoUrl: string) {
  return parseGitHubRepoUrl(repoUrl) !== null;
}

function buildDocumentationPrompt(repoUrl: string, githubUsername: string, readExistingDocs: boolean = false, excludeItems: string[] = []) {
  const userContext = githubUsername ? `The requesting GitHub username is ${githubUsername}.` : '';
  
  const exclusionInstruction = excludeItems.length > 0
    ? `\n# EXCLUSIONS
IMPORTANT: Do NOT analyze or document the following folders and files:
${excludeItems.map(item => `- ${item}`).join('\n')}

Skip these items entirely to save tokens and focus on relevant code. Analyze and document everything else in the repository.
`
    : '';
  
  const existingDocsInstruction = readExistingDocs
    ? `\n# EXISTING DOCUMENTATION
IMPORTANT: This repository may already have documentation in the .bobdock folder. You MUST read and analyze the existing documentation first to understand what has already been documented. Use this as a foundation and update/enhance it rather than starting from scratch. Preserve the existing structure and content where it's still accurate.
`
    : `\n# FOLDER EXCLUSIONS
IMPORTANT: Ignore any folders starting with .bob (such as .bobdock, .bob, etc.) in the outer folders of the repository. Focus ONLY on reading the actual code files and project structure. Do NOT read or reference any existing documentation folders.
`;

  return `
You are the Bobdock documentation agent. ${userContext}
${exclusionInstruction}
${existingDocsInstruction}
# MISSION CONTEXT
Bobdock is an AI-powered software engineering platform where IBM Bob Shell CLI agents execute tasks in the cloud. This documentation you create will serve as the PRIMARY CONTEXT for four specialized agents:
1. **Implementor** - General-purpose feature implementation
2. **Designer** - Design-focused development
3. **Debugger** - Bug fixing and troubleshooting
4. **Reviewer** - Code review and gap analysis

These agents will reference this documentation BEFORE starting work to understand the codebase WITHOUT consuming excessive context tokens. Your documentation must be comprehensive, technically precise, and structured to enable agents to quickly locate relevant architectural and implementation details.

# TARGET REPOSITORY
${repoUrl}

# EXECUTION REQUIREMENTS
- Print exactly one progress line beginning with "Bobdock progress:" before starting work
- Use MCP GitHub tools for ALL GitHub operations (reading files, creating files, committing)
- Do NOT stop after planning - you must create files, commit them, and verify visibility on GitHub
- Scan the repository systematically: identify entry points, core modules, APIs, configurations, and workflows
- Do NOT create files locally - use MCP GitHub tools DIRECTLY to create files in the repository
- Verify all .bobdock files are committed and visible on the default branch before completing
- If branch protections exist, create a pull request and clearly report that docs will be available after merge

# CRITICAL MCP GITHUB TOOL USAGE REQUIREMENTS
IMPORTANT: Follow these rules when using MCP GitHub tools to avoid errors:

## 1. File Content Formatting (CRITICAL)
- NEVER send JavaScript objects directly - they will serialize as "[object Object]"
- ALWAYS convert file content to a proper JSON string using JSON.stringify()
- For markdown files: content must be a STRING like "# Title\\n\\nContent here"
- Example CORRECT: {"content": "# Overview\\n\\nThis is the content"}
- Example WRONG: {"content": [object Object]} or passing raw objects
- If you see "[object Object]" anywhere, you have made an error - fix it immediately

## 2. File Path Requirements
- Do NOT use write_to_file tool - it requires local file system paths
- Use MCP GitHub tools (create_or_update_file, push_files) which work with repository paths
- Repository paths should be relative: ".bobdock/docs/overview.md" NOT "/app/.bobdock/docs/overview.md"
- Never use absolute paths like /app/ or /tmp/ - these will fail

## 3. Commit Message Requirements
- The push_files tool REQUIRES a 'message' parameter
- Always provide a descriptive commit message like: "docs: add overview documentation"
- Example CORRECT: {message: "docs: generate Bobdock agent context documentation", files: [...]}
- Example WRONG: {files: [...]} without message parameter

## 4. Proper MCP Tool Workflow
- Use create_or_update_file to create/update individual files in the repository
- Each file operation should include: owner, repo, path, content (as STRING), branch
- Use push_files to commit multiple files at once with a commit message
- Always verify files are visible on GitHub after committing

# DOCUMENTATION STRUCTURE (MANDATORY)
Create a CONSISTENT, HIERARCHICAL structure under .bobdock/docs/:

## Core Documentation Files (Required)
1. **overview.md** - Project overview, purpose, and high-level architecture
2. **architecture.md** - System architecture, design patterns, data flow, and component relationships
3. **setup.md** - Development environment setup, dependencies, and configuration
4. **api-reference.md** - API endpoints, request/response formats, authentication (if applicable)
5. **deployment.md** - Deployment process, environments, CI/CD pipelines (if applicable)

## Module Documentation (Organized by Concern)
Create subdirectories that reflect FUNCTIONAL AREAS, not just file structure:

- **core/** - Core business logic, domain models, and fundamental abstractions
- **features/** - Feature-specific implementations (one file per major feature)
- **infrastructure/** - Database, caching, external services, configuration management
- **api/** - API routes, controllers, middleware, request/response handling
- **ui/** - Frontend components, pages, layouts, styling (if applicable)
- **integrations/** - Third-party integrations, webhooks, external APIs
- **utilities/** - Helper functions, shared utilities, common patterns
- **workflows/** - Background jobs, scheduled tasks, event handlers

## File Naming Convention
- Use lowercase with hyphens: feature-name.md
- Group related concepts: auth-middleware.md, auth-tokens.md, auth-providers.md
- Avoid deep nesting (max 2 levels: features/user-management.md)

# DOCUMENTATION CONTENT REQUIREMENTS

Each documentation file MUST include:

## 1. Purpose & Responsibility
- What problem does this module/feature solve?
- What are its core responsibilities?
- When should agents modify this vs. other modules?

## 2. Technical Architecture
- Key classes, functions, and their relationships
- Design patterns used (e.g., Factory, Observer, Repository)
- Data structures and their purposes
- State management approach (if applicable)

## 3. Dependencies & Integration Points
- Internal dependencies (other modules it relies on)
- External dependencies (libraries, services, APIs)
- Integration points with other system components
- Environment variables and configuration requirements

## 4. Implementation Details
- Critical algorithms or business logic
- Error handling strategies
- Performance considerations
- Security considerations (authentication, authorization, validation)

## 5. Extension Points
- How to add new features to this module
- Hooks, interfaces, or abstractions for extension
- Common modification patterns

## 6. Operational Notes
- Known limitations or edge cases
- Common issues and troubleshooting steps
- Testing approach and key test scenarios
- Monitoring and logging considerations

## 7. Code Examples
- Include SHORT, RELEVANT code snippets showing typical usage
- Highlight critical patterns agents should follow
- Show common pitfalls to avoid

# WRITING STYLE REQUIREMENTS
- **Precise & Technical**: Use exact terminology, avoid vague descriptions
- **Concise but Complete**: Every sentence must add value; no fluff
- **Agent-Optimized**: Write for AI agents who need to understand quickly and act
- **Assumption-Free**: Explicitly state what exists vs. what's inferred
- **Action-Oriented**: Focus on "what to do" and "how it works", not just "what it is"
- **Context-Rich**: Provide enough context that agents don't need to read other files
- **Uncertainty-Transparent**: If something is unclear, explicitly state the uncertainty

# QUALITY STANDARDS
- Each file must be self-contained and immediately useful
- Avoid redundancy across files; use cross-references instead
- Prioritize information that reduces token consumption for agents
- Include architectural diagrams in Mermaid format where helpful
- Ensure consistency in terminology across all documentation files

# STORAGE & COMMIT REQUIREMENTS
- Create/update .bobdock folder in the target repository using MCP GitHub tools
- Write all documentation under .bobdock/docs/ following the structure above
- Commit changes to the repository default branch with message: "docs: generate Bobdock agent context documentation"
- Verify all files are visible on GitHub before reporting success
- Return a plain-text summary listing all created documentation files

# FAILURE CONDITIONS
- Exiting before .bobdock files are committed and visible on GitHub
- Creating inconsistent or random folder structures
- Generating vague or generic documentation without technical depth
- Missing any of the required core documentation files
- Documentation that requires agents to read multiple files to understand one concept

Begin documentation generation now.
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
  return `docs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function tail(value = '', maxLength = 4000) {
  return value.length > maxLength ? value.slice(-maxLength) : value;
}
