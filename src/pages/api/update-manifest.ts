import type { APIRoute } from 'astro';
import { parseGitHubRepoUrl, updateManifest } from '../../lib/githubDocsStore';

export const prerender = false;

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

		const manifest = await updateManifest(parsed.owner, parsed.repo, githubToken);

		return json({ success: true, manifest });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to update manifest';
		return json({ success: false, error: message }, 500);
	}
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
