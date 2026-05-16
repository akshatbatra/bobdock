import type { APIRoute } from 'astro';

export const prerender = false;

type GitHubTreeItem = {
  path: string;
  type: 'tree' | 'blob';
  sha: string;
};

type GitHubTreeResponse = {
  tree: GitHubTreeItem[];
  truncated: boolean;
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const repoUrl = typeof body?.repoUrl === 'string' ? body.repoUrl.trim() : '';
  const githubToken = typeof body?.githubToken === 'string' ? body.githubToken.trim() : '';

  if (!repoUrl || !githubToken) {
    return json({ success: false, error: 'Repository URL and GitHub token are required.' }, 400);
  }

  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    return json({ success: false, error: 'Invalid GitHub repository URL.' }, 400);
  }

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');

  try {
    // Get default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!repoResponse.ok) {
      return json({ success: false, error: 'Failed to fetch repository information.' }, 502);
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';

    // Get tree structure recursively
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!treeResponse.ok) {
      return json({ success: false, error: 'Failed to fetch repository structure.' }, 502);
    }

    const treeData = await treeResponse.json() as GitHubTreeResponse;

    // Extract top-level items (folders and files)
    const items = new Map<string, { type: 'folder' | 'file', children: string[] }>();
    
    for (const item of treeData.tree) {
      const parts = item.path.split('/');
      const topLevel = parts[0];
      
      // Add top-level item
      if (!items.has(topLevel)) {
        items.set(topLevel, {
          type: item.type === 'tree' || parts.length > 1 ? 'folder' : 'file',
          children: []
        });
      }
      
      // Add second-level items for folders
      if (parts.length === 2 && item.type === 'tree') {
        const parent = items.get(topLevel);
        if (parent && !parent.children.includes(parts[1])) {
          parent.children.push(parts[1]);
        }
      } else if (parts.length === 2 && item.type === 'blob') {
        const parent = items.get(topLevel);
        if (parent && !parent.children.includes(parts[1])) {
          parent.children.push(parts[1]);
        }
      }
    }

    // Convert to sorted structure
    const structure: Record<string, { type: 'folder' | 'file', children: string[] }> = {};
    Array.from(items.keys()).sort().forEach(key => {
      const item = items.get(key);
      if (item) {
        structure[key] = {
          type: item.type,
          children: item.children.sort()
        };
      }
    });

    return json({
      success: true,
      structure,
      totalItems: treeData.tree.length,
      truncated: treeData.truncated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch repository structure.';
    return json({ success: false, error: message }, 500);
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

// Made with Bob
