import React, { useEffect, useState } from 'react';
import type { ContextReference } from './BobdockWorkspace';

const SELECTIONS_KEY = 'bobdock.context.selections';

type SelectionItem = {
  title: string;
  path: string; // URL pathname like "/project-docs/owner/repo/overview"
  docPath?: string; // Actual doc file path like "overview.md"
  heading?: string;
  slug?: string;
};

function readSelections(): SelectionItem[] {
  try {
    return JSON.parse(window.localStorage.getItem(SELECTIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function clearSelections() {
  try {
    window.localStorage.removeItem(SELECTIONS_KEY);
  } catch {
    // No-op.
  }
}

function extractSection(markdown: string, heading: string, slug: string): string {
  const lines = markdown.split('\n');
  let inSection = false;
  let sectionLines: string[] = [];
  let sectionDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);
    
    if (headingMatch) {
      const depth = headingMatch[1].length;
      const text = headingMatch[2].replace(/[`*_~]/g, '').trim();
      
      if (text === heading && !inSection) {
        inSection = true;
        sectionDepth = depth;
        sectionLines.push(line);
        continue;
      }
      
      if (inSection && depth <= sectionDepth) {
        break;
      }
    }
    
    if (inSection) {
      sectionLines.push(line);
    }
  }
  
  return sectionLines.join('\n').trim();
}

/* ─── Icons ─── */

function IconRegenerate({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function IconExternal({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconRefresh({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconDoc({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconClose({ size = 12 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

/* ─── Main Panel ─── */

export default function ContextPanel({
  docs,
  projectTitle,
  loadingDocs,
  isGeneratingDocs,
  loadDocsList,
  generateDocs,
  attachReference,
  docsUrl,
}: {
  docs: { path: string; title: string }[];
  projectTitle: string;
  loadingDocs: boolean;
  isGeneratingDocs: boolean;
  loadDocsList: () => void;
  generateDocs: () => void;
  attachReference: (ref: ContextReference) => void;
  docsUrl: string;
}) {
  const [selections, setSelections] = useState<SelectionItem[]>([]);
  const [isAttaching, setIsAttaching] = useState(false);

  useEffect(() => {
    setSelections(readSelections());
    
    // Poll for selection changes from iframe
    const interval = setInterval(() => {
      setSelections(readSelections());
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  const handleAttachFromStarlight = async () => {
    console.log('Attach button clicked');
    const items = readSelections();
    console.log('Items to attach:', items);
    
    if (items.length === 0) {
      console.log('No items to attach');
      return;
    }

    setIsAttaching(true);
    
    try {
      // Try to get repo URL from multiple sources
      let repoUrl = '';
      let owner = '';
      let repo = '';
      
      // First try: from the docsUrl prop (most reliable)
      if (docsUrl) {
        const urlMatch = docsUrl.match(/project-docs\/([^/]+)\/([^/]+)/);
        if (urlMatch) {
          [, owner, repo] = urlMatch;
          repoUrl = `https://github.com/${owner}/${repo}`;
          console.log('Extracted from docsUrl:', repoUrl);
        }
      }
      
      // Second try: from the first item's path
      if (!repoUrl && items[0].path) {
        const pathMatch = items[0].path.match(/project-docs\/([^/]+)\/([^/]+)/);
        if (pathMatch) {
          [, owner, repo] = pathMatch;
          repoUrl = `https://github.com/${owner}/${repo}`;
          console.log('Extracted from item path:', repoUrl);
        }
      }
      
      // Third try: from window location (if iframe is same-origin)
      if (!repoUrl) {
        try {
          const locationMatch = window.location.pathname.match(/project-docs\/([^/]+)\/([^/]+)/);
          if (locationMatch) {
            [, owner, repo] = locationMatch;
            repoUrl = `https://github.com/${owner}/${repo}`;
            console.log('Extracted from window location:', repoUrl);
          }
        } catch (e) {
          console.log('Could not access window location');
        }
      }
      
      if (!repoUrl) {
        console.error('Could not extract repo info. Items:', items, 'docsUrl:', docsUrl);
        alert('Could not determine repository. Please ensure you have documentation loaded.');
        setIsAttaching(false);
        return;
      }
      
      console.log('Using repo URL:', repoUrl);
      
      // Get the GitHub token from cookie
      const tokenCookie = document.cookie.split(';').find(c => c.trim().startsWith('bobdock.github.token='));
      const githubToken = tokenCookie ? decodeURIComponent(tokenCookie.split('=')[1]) : '';
      console.log('Has token:', !!githubToken);
      
      for (const item of items) {
        // For section selections, path is the docPath directly
        // For page selections, docPath is stored separately
        let docPath = '';
        
        if (item.docPath) {
          // Page selection - docPath is stored separately
          docPath = item.docPath;
          console.log('Using docPath from item:', docPath);
        } else if (item.path) {
          // Section selection - path IS the docPath
          docPath = item.path;
          console.log('Using path as docPath:', docPath);
        }
        
        if (!docPath) {
          console.error('Could not determine doc path for item:', item);
          continue;
        }
        
        // Ensure it has .md extension
        if (!docPath.endsWith('.md')) {
          docPath += '.md';
        }
        
        console.log('Fetching doc:', docPath);
        
        // Fetch full markdown content for this selection
        const response = await fetch('/api/context-docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl,
            githubToken,
            docPath,
          }),
        });
        
        if (!response.ok) {
          console.error('Failed to fetch doc:', docPath, response.status);
          continue;
        }
        
        const result = await response.json();
        let fullContent = result.doc?.markdown || '';
        console.log('Fetched content length:', fullContent.length);
        
        // If it's a section, extract just that section
        if (item.heading && item.slug) {
          fullContent = extractSection(fullContent, item.heading, item.slug);
          console.log('Extracted section length:', fullContent.length);
        }
        
        console.log('Attaching reference:', item.title, item.heading || 'full page');
        console.log('Reference object:', {
          title: item.title,
          path: docPath, // Use the actual doc path, not the URL path
          heading: item.heading,
          excerptLength: fullContent.length,
        });
        
        attachReference({
          title: item.title,
          path: docPath, // Use docPath instead of item.path for consistency
          heading: item.heading,
          excerpt: fullContent, // Store full markdown in excerpt field
        });
        
        console.log('attachReference called successfully');
      }

      console.log('All items attached, clearing selections');
      clearSelections();
      setSelections([]);
    } catch (error) {
      console.error('Failed to attach selections:', error);
      alert('Failed to attach selections. Check console for details.');
    } finally {
      setIsAttaching(false);
    }
  };

  const handleClearSelections = () => {
    clearSelections();
    setSelections([]);
  };

  const totalSelections = selections.length;
  const pageSelections = selections.filter((s) => !s.heading).length;
  const sectionSelections = selections.filter((s) => s.heading).length;

  return (
    <section className="context-layout-fullwidth">
      {docs.length === 0 ? (
        <div className="workspace-panel doc-empty-state-centered">
          <p>Generate or reuse Bobdock documentation to attach codebase context to tasks.</p>
          <button className="primary-action" type="button" onClick={generateDocs} disabled={isGeneratingDocs}>
            {isGeneratingDocs ? 'Generating\u2026' : 'Generate context docs'}
          </button>
        </div>
      ) : (
        <>
          {docsUrl ? (
            <div className="workspace-panel doc-content-iframe">
              {totalSelections > 0 && (
                <div className="floating-attach-button">
                  <button
                    className="attach-floating-btn"
                    type="button"
                    onClick={handleAttachFromStarlight}
                    disabled={isAttaching}
                    title={`Attach ${totalSelections} selection${totalSelections !== 1 ? 's' : ''} to task`}
                  >
                    <IconCheck size={16} />
                    <span>{isAttaching ? 'Attaching...' : `Attach ${totalSelections}`}</span>
                  </button>
                  <button
                    className="clear-floating-btn"
                    type="button"
                    onClick={handleClearSelections}
                    disabled={isAttaching}
                    title="Clear selections"
                  >
                    <IconClose size={14} />
                  </button>
                </div>
              )}
              <iframe
                src={docsUrl}
                className="starlight-docs-iframe"
                title="Documentation"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          ) : (
            <div className="workspace-panel doc-empty-state-centered">
              <p>Documentation URL not available.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
