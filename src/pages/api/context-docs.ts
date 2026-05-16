import type { APIRoute } from 'astro';
import { marked } from 'marked';
import {
  parseGitHubRepoUrl,
  readGitHubProjectDoc,
  readGitHubProjectDocs,
} from '../../lib/githubDocsStore';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const repoUrl = typeof body?.repoUrl === 'string' ? body.repoUrl.trim() : '';
  const githubToken = typeof body?.githubToken === 'string' ? body.githubToken.trim() : '';
  const docPath = typeof body?.docPath === 'string' ? body.docPath.trim() : '';

  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) {
    return json({ success: false, error: 'Enter a valid GitHub repository URL.' }, 400);
  }

  try {
    const project = await readGitHubProjectDocs(parsed.owner, parsed.repo, githubToken);

    if (!docPath) {
      return json({
        success: true,
        project: {
          owner: project.owner,
          repo: project.repo,
          projectTitle: project.projectTitle,
          summary: project.summary,
          docsUrl: `/project-docs/${project.owner}/${project.repo}`,
        },
        docs: project.docs,
      });
    }

    const markdown = await readGitHubProjectDoc(project, docPath, githubToken);

    return json({
      success: true,
      doc: {
        path: docPath,
        title: project.docs.find((doc) => doc.path === docPath)?.title ?? docPath,
        markdown,
        sections: collectSections(markdown),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bobdock could not load generated documentation.';
    return json({ success: false, error: message }, 502);
  }
};

function collectSections(markdown: string) {
  return marked
    .lexer(markdown)
    .filter((token) => token.type === 'heading' && (token.depth === 2 || token.depth === 3))
    .map((token) => ({
      heading: token.text.replace(/[`*_~]/g, '').trim(),
      depth: token.depth,
      excerpt: excerptAfterHeading(markdown, token.raw),
    }));
}

function excerptAfterHeading(markdown: string, headingRaw: string) {
  const start = markdown.indexOf(headingRaw);
  if (start === -1) return '';

  const rest = markdown.slice(start + headingRaw.length);
  const nextHeading = rest.search(/\n#{2,3}\s+/);
  const section = (nextHeading === -1 ? rest : rest.slice(0, nextHeading))
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return section.length > 220 ? `${section.slice(0, 217)}...` : section;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
