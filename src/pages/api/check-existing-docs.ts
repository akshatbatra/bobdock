import type { APIRoute } from 'astro';
import { parseGitHubRepoUrl, createProjectDocsUrl } from '../../lib/githubDocsStore';

const docsRoot = '.bobdock/docs';

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const repoUrl = body?.repoUrl as string | undefined;
		const githubToken = body?.githubToken as string | undefined;

		if (!repoUrl || !githubToken) {
			return json({ success: false, error: 'Missing repoUrl or githubToken' }, 400);
		}

		const parsed = parseGitHubRepoUrl(repoUrl);
		if (!parsed) {
			return json({ success: false, error: 'Invalid repository URL' }, 400);
		}

		const exists = await checkDocsFolderExists(parsed.owner, parsed.repo, githubToken);
		const docsUrl = exists ? createProjectDocsUrl(repoUrl) : undefined;

		return json({ success: true, exists, docsUrl });
	} catch (error) {
		return json({ success: false, error: 'Failed to check existing documentation' }, 500);
	}
};

async function checkDocsFolderExists(owner: string, repo: string, token: string): Promise<boolean> {
	const headers = {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'User-Agent': 'bobdock-docs',
		'X-GitHub-Api-Version': '2022-11-28',
	};
	const defaultBranch = await getDefaultBranch(owner, repo, headers);
	const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`;

	const response = await fetch(url, { headers });
	if (!response.ok) return false;

	const data = (await response.json()) as { tree?: { path?: string; type?: string }[] };
	const docsRootPrefix = `${docsRoot}/`;
	return (data.tree ?? []).some(
		(entry) =>
			entry.type === 'blob' &&
			(entry.path === '.bobdock/manifest.json' || entry.path?.startsWith(docsRootPrefix))
	);
}

async function getDefaultBranch(owner: string, repo: string, headers: Record<string, string>) {
	const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
		headers,
	});

	if (!response.ok) {
		return 'main';
	}

	const data = (await response.json()) as { default_branch?: string };
	return data.default_branch || 'main';
}

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
