export type GitHubDocEntry = {
	path: string;
	title: string;
};

export type GitHubProjectDocs = {
	repoUrl: string;
	owner: string;
	repo: string;
	projectTitle: string;
	summary: string;
	docsRoot: string;
	docs: GitHubDocEntry[];
};

type BobdockManifest = {
	projectTitle?: string;
	summary?: string;
	docsRoot?: string;
	docs?: GitHubDocEntry[];
};

type GitHubContentResponse = {
	type?: string;
	content?: string;
	encoding?: string;
	download_url?: string | null;
};

type GitHubTreeEntry = {
	path?: string;
	type?: string;
	sha?: string;
};

const defaultDocsRoot = '.bobdock/docs';
const manifestPath = '.bobdock/manifest.json';

export function parseGitHubRepoUrl(repoUrl: string) {
	try {
		const url = new URL(repoUrl);
		const [owner, repoWithSuffix] = url.pathname.split('/').filter(Boolean);
		const repo = repoWithSuffix?.replace(/\.git$/i, '');

		if (url.hostname.toLowerCase() !== 'github.com' || !owner || !repo) {
			return null;
		}

		return { owner, repo };
	} catch {
		return null;
	}
}

export function createProjectDocsUrl(repoUrl: string) {
	const parsed = parseGitHubRepoUrl(repoUrl);

	if (!parsed) {
		return undefined;
	}

	return `/project-docs/${parsed.owner}/${parsed.repo}`;
}

export function normalizeDocPath(input: string) {
	const withoutLeadingSlash = input.trim().replace(/^\/+/, '');
	const cleanSegments = withoutLeadingSlash
		.split(/[\\/]+/)
		.map((segment) => segment.trim())
		.filter(Boolean)
		.filter((segment) => segment !== '.' && segment !== '..')
		.map((segment) => segment.replace(/[<>:"|?*]/g, '-'));

	const joined = cleanSegments.join('/');

	if (!joined) {
		return 'overview.md';
	}

	return joined.toLowerCase().endsWith('.md') ? joined : `${joined}.md`;
}

export async function readGitHubProjectDocs(owner: string, repo: string, token?: string) {
	try {
		const manifest = (await readGitHubJson(owner, repo, manifestPath, token)) as BobdockManifest;
		const docsRoot =
			typeof manifest.docsRoot === 'string' && manifest.docsRoot.trim()
				? normalizeDirectoryPath(manifest.docsRoot)
				: defaultDocsRoot;
		const docs = Array.isArray(manifest.docs)
			? manifest.docs
					.filter((doc) => typeof doc?.path === 'string')
					.map((doc) => {
						const path = normalizeProjectDocPath(doc.path, docsRoot);

						return {
							path,
							title: typeof doc.title === 'string' && doc.title.trim() ? doc.title.trim() : path,
						};
					})
			: [];

		return {
			repoUrl: `https://github.com/${owner}/${repo}`,
			owner,
			repo,
			projectTitle:
				typeof manifest.projectTitle === 'string' && manifest.projectTitle.trim()
					? manifest.projectTitle.trim()
					: `${owner}/${repo}`,
			summary:
				typeof manifest.summary === 'string' && manifest.summary.trim()
					? manifest.summary.trim()
					: 'Generated repository documentation.',
			docsRoot,
			docs,
		} satisfies GitHubProjectDocs;
	} catch {
		return buildProjectDocsFromTree(owner, repo, token);
	}
}

async function buildProjectDocsFromTree(owner: string, repo: string, token?: string) {
	const headers = token ? githubHeadersWithToken(token) : githubHeaders();
	const branch = await getDefaultBranch(owner, repo, headers);
	const tree = await getRecursiveTree(owner, repo, branch, headers);

	const docsRoot = defaultDocsRoot;
	const docsRootPrefix = `${docsRoot}/`;
	const mdFiles = tree
		.filter((entry) => entry.type === 'blob' && entry.path?.startsWith(docsRootPrefix) && entry.path.endsWith('.md'))
		.map((entry) => {
			const relativePath = entry.path!.slice(docsRootPrefix.length);
			return { path: relativePath, sha: entry.sha };
		});

	const docs = await Promise.all(
		mdFiles.map(async (file) => {
			const title = await extractTitleFromFile(owner, repo, `${docsRoot}/${file.path}`, headers);
			return { path: file.path, title };
		})
	);

	const overviewContent = docs.find((d) => d.path === 'overview.md');
	const projectTitle = overviewContent?.title ?? `${owner}/${repo}`;
	const summary = 'Generated repository documentation.';

	return {
		repoUrl: `https://github.com/${owner}/${repo}`,
		owner,
		repo,
		projectTitle,
		summary,
		docsRoot,
		docs,
	} satisfies GitHubProjectDocs;
}

export async function updateManifest(owner: string, repo: string, token: string) {
	const docsRoot = defaultDocsRoot;
	const headers = githubHeadersWithToken(token);

	const defaultBranch = await getDefaultBranch(owner, repo, headers);
	const tree = await getRecursiveTree(owner, repo, defaultBranch, headers);

	const docsRootPrefix = `${docsRoot}/`;
	const mdFiles = tree
		.filter((entry) => entry.type === 'blob' && entry.path?.startsWith(docsRootPrefix) && entry.path.endsWith('.md'))
		.map((entry) => {
			const relativePath = entry.path!.slice(docsRootPrefix.length);
			return { path: relativePath, sha: entry.sha };
		});

	const docs = await Promise.all(
		mdFiles.map(async (file) => {
			const title = await extractTitleFromFile(owner, repo, `${docsRoot}/${file.path}`, headers);
			return { path: file.path, title };
		})
	);

	const overviewContent = docs.find((d) => d.path === 'overview.md');
	const projectTitle = overviewContent?.title ?? `${owner}/${repo}`;

	const manifestContent = JSON.stringify(
		{
			projectTitle,
			summary: 'Generated repository documentation.',
			docsRoot,
			docs,
		},
		null,
		2
	);

	await commitFile(owner, repo, defaultBranch, manifestPath, manifestContent, token);

	return {
		defaultBranch,
		docsCount: docs.length,
		docsRoot,
	};
}

async function getDefaultBranch(owner: string, repo: string, headers: Record<string, string>) {
	const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
		headers,
	});

	if (!response.ok) {
		throw new Error(`GitHub returned ${response.status} for repo info.`);
	}

	const data = (await response.json()) as { default_branch?: string };
	return data.default_branch ?? 'main';
}

async function getRecursiveTree(owner: string, repo: string, branch: string, headers: Record<string, string>) {
	const treeResponse = await fetch(
		`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
		{ headers }
	);

	if (!treeResponse.ok) {
		throw new Error(`GitHub tree API returned ${treeResponse.status}.`);
	}

	const treeData = (await treeResponse.json()) as { tree?: GitHubTreeEntry[]; truncated?: boolean };
	return treeData.tree ?? [];
}

async function extractTitleFromFile(owner: string, repo: string, path: string, headers: Record<string, string>) {
	try {
		const content = await readGitHubTextWithHeaders(owner, repo, path, headers);
		const match = content.match(/^#\s+(.+)/m);
		return match?.[1]?.replace(/[`*_~]/g, '').trim() ?? path;
	} catch {
		return path;
	}
}

async function commitFile(owner: string, repo: string, branch: string, path: string, content: string, token: string) {
	const encodedPath = path.split('/').map(encodeURIComponent).join('/');
	const headers = githubHeadersWithToken(token);

	const existingResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`, {
		headers,
	});

	let sha: string | undefined;
	if (existingResponse.ok) {
		const existing = (await existingResponse.json()) as { sha?: string };
		sha = existing.sha;
	}

	const encodedContent = btoa(new TextEncoder().encode(content).reduce((str, byte) => str + String.fromCharCode(byte), ''));

	const body: Record<string, unknown> = {
		message: 'chore: update bobdock manifest',
		content: encodedContent,
		branch,
	};

	if (sha) {
		body.sha = sha;
	}

	const commitResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`, {
		method: 'PUT',
		headers,
		body: JSON.stringify(body),
	});

	if (!commitResponse.ok) {
		const errBody = await commitResponse.text();
		throw new Error(`Failed to commit manifest: ${errBody}`);
	}
}

export async function readGitHubProjectDoc(project: GitHubProjectDocs, docPath: string, token?: string) {
	const normalizedPath = normalizeDocPath(docPath);
	const fullPath = `${project.docsRoot}/${normalizedPath}`;

	return readGitHubText(project.owner, project.repo, fullPath, token);
}

export async function readGitHubFile(owner: string, repo: string, path: string, token?: string) {
	return readGitHubText(owner, repo, normalizeFilePath(path), token);
}

async function readGitHubJson(owner: string, repo: string, path: string, token?: string) {
	const text = await readGitHubText(owner, repo, path, token);

	return JSON.parse(text) as unknown;
}

async function readGitHubText(owner: string, repo: string, path: string, token?: string) {
	return readGitHubTextWithHeaders(owner, repo, path, token ? githubHeadersWithToken(token) : githubHeaders());
}

async function readGitHubTextWithHeaders(owner: string, repo: string, path: string, headers: Record<string, string>) {
	const response = await fetch(githubContentsUrl(owner, repo, path), {
		headers,
	});

	if (!response.ok) {
		throw new Error(`GitHub returned ${response.status} for ${path}.`);
	}

	const body = (await response.json()) as GitHubContentResponse;

	if (body.type !== 'file') {
		throw new Error(`${path} is not a file in GitHub.`);
	}

	if (body.encoding === 'base64' && typeof body.content === 'string') {
		return Buffer.from(body.content.replace(/\s/g, ''), 'base64').toString('utf8');
	}

	if (body.download_url) {
		const rawResponse = await fetch(body.download_url, {
			headers,
		});

		if (!rawResponse.ok) {
			throw new Error(`GitHub raw content returned ${rawResponse.status} for ${path}.`);
		}

		return rawResponse.text();
	}

	throw new Error(`GitHub did not return readable content for ${path}.`);
}

function githubContentsUrl(owner: string, repo: string, path: string) {
	return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
		.split('/')
		.map(encodeURIComponent)
		.join('/')}`;
}

function githubHeaders() {
	return {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'bobdock-docs',
		'X-GitHub-Api-Version': '2022-11-28',
	};
}

function githubHeadersWithToken(token: string) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'User-Agent': 'bobdock-docs',
		'X-GitHub-Api-Version': '2022-11-28',
	};
}

function normalizeDirectoryPath(input: string) {
	return input
		.trim()
		.replace(/^\/+|\/+$/g, '')
		.split(/[\\/]+/)
		.map((segment) => segment.trim())
		.filter(Boolean)
		.filter((segment) => segment !== '.' && segment !== '..')
		.join('/');
}

function normalizeProjectDocPath(input: string, docsRoot: string) {
	const normalizedInput = normalizeDocPath(input);
	const normalizedDocsRoot = normalizeDirectoryPath(docsRoot);
	const docsRootPrefix = `${normalizedDocsRoot}/`;

	if (normalizedInput === normalizedDocsRoot) {
		return 'overview.md';
	}

	return normalizedInput.startsWith(docsRootPrefix)
		? normalizedInput.slice(docsRootPrefix.length)
		: normalizedInput;
}

function normalizeFilePath(input: string) {
	return input
		.trim()
		.replace(/^\/+/, '')
		.split(/[\\/]+/)
		.map((segment) => segment.trim())
		.filter(Boolean)
		.filter((segment) => segment !== '.' && segment !== '..')
		.join('/');
}
