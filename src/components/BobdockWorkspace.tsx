import React, { useEffect, useMemo, useState } from 'react';
import ContextPanel from './ContextPanel';

export type AgentRole = 'implementor' | 'designer' | 'debugger' | 'reviewer';
export type WorkspaceTab = 'agents' | 'context';
export type WorkspaceStep = 'credentials' | 'repository' | 'workspace';

export type DocEntry = {
  path: string;
  title: string;
};

export type DocSection = {
  heading: string;
  depth: number;
  excerpt?: string;
};

export type ContextReference = {
  title: string;
  path: string;
  heading?: string;
  excerpt?: string;
};

export type RepoStructureItem = {
  type: 'folder' | 'file';
  children: string[];
};

const storageKeys = {
  username: 'bobdock.github.username',
  token: 'bobdock.github.token',
  repoUrl: 'bobdock.github.repoUrl',
  draftTitle: 'bobdock.task.title',
  draftSpec: 'bobdock.task.spec',
};

const bobAsset = '/BobAnimationPlaceholder-BWZj7W25.svg';

const agents: Array<{
  role: AgentRole;
  name: string;
  accent: string;
  label: string;
  mark: string;
  description: string;
  guidance: string;
}> = [
  {
    role: 'implementor',
    name: 'Implementor',
    accent: '#0f62fe',
    label: 'Build',
    mark: '<>',
    description: 'Feature implementation, API changes, full-stack wiring, and production code.',
    guidance: 'Use when the spec describes new capability or broad product behavior.',
  },
  {
    role: 'designer',
    name: 'Designer',
    accent: '#ff832b',
    label: 'Design',
    mark: 'UI',
    description: 'Interface systems, responsive layouts, interaction states, and visual refinement.',
    guidance: 'Use when the output is judged by product polish and user experience.',
  },
  {
    role: 'debugger',
    name: 'Debugger',
    accent: '#198038',
    label: 'Debug',
    mark: 'DBG',
    description: 'Reproduction, diagnosis, bug fixes, regression tests, and focused verification.',
    guidance: 'Use when something is broken, flaky, slow, or behaving unexpectedly.',
  },
  {
    role: 'reviewer',
    name: 'Reviewer',
    accent: '#8a3ffc',
    label: 'Review',
    mark: '✓',
    description: 'Quality review, gaps, risks, missing tests, security concerns, and PR critique.',
    guidance: 'Use when work needs a second pass before merge or handoff.',
  },
];

export default function BobdockWorkspace() {
  const [step, setStep] = useState<WorkspaceStep>('credentials');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('agents');
  const [selectedRole, setSelectedRole] = useState<AgentRole>('implementor');
  const [title, setTitle] = useState('');
  const [spec, setSpec] = useState('');
  const [references, setReferences] = useState<ContextReference[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('');
  const [sections, setSections] = useState<DocSection[]>([]);
  const [docMarkdown, setDocMarkdown] = useState('');
  const [repoStructure, setRepoStructure] = useState<Record<string, RepoStructureItem>>({});
  const [excludedItems, setExcludedItems] = useState<string[]>([]);
  const [pendingRepoUrl, setPendingRepoUrl] = useState('');
  const [pendingDocsUrl, setPendingDocsUrl] = useState('');
  const [readExistingDocs, setReadExistingDocs] = useState(false);
  const [showExistingDocsModal, setShowExistingDocsModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [taskStatus, setTaskStatus] = useState('');
  const [taskOutput, setTaskOutput] = useState('');
  const [docsLoaded, setDocsLoaded] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.role === selectedRole) ?? agents[0],
    [selectedRole]
  );

  const repoLabel = useMemo(() => repoUrl.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/i, ''), [repoUrl]);
  const docsReady = docs.length > 0;

  useEffect(() => {
    const savedUsername = readValue(storageKeys.username);
    const savedToken = readValue(storageKeys.token);
    const savedRepoUrl = readValue(storageKeys.repoUrl);

    setUsername(savedUsername);
    setToken(savedToken);
    setRepoUrl(savedRepoUrl);
    setTitle(readValue(storageKeys.draftTitle));
    setSpec(readValue(storageKeys.draftSpec));

    if (savedUsername && savedToken && savedRepoUrl) {
      setStep('workspace');
    } else if (savedUsername && savedToken) {
      setStep('repository');
    }
  }, []);

  useEffect(() => {
    writeValue(storageKeys.draftTitle, title);
  }, [title]);

  useEffect(() => {
    writeValue(storageKeys.draftSpec, spec);
  }, [spec]);

  useEffect(() => {
    if (step === 'workspace' && repoUrl && token && !docsLoaded) {
      void loadDocsList();
    }
  }, [step, repoUrl, token, docsLoaded]);

  function saveCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUsername = username.trim();
    const nextToken = token.trim();

    if (!nextUsername || !nextToken) return;

    writeValue(storageKeys.username, nextUsername);
    writeValue(storageKeys.token, nextToken);
    writeTokenCookie(nextToken);
    setUsername(nextUsername);
    setToken(nextToken);
    setStep('repository');
    setNotice('');
    setError('');
  }

  function resetWorkspace() {
    for (const key of Object.values(storageKeys)) {
      removeValue(key);
    }

    document.cookie = 'bobdock.github.token=; Path=/; Max-Age=0; SameSite=Lax';
    setStep('credentials');
    setUsername('');
    setToken('');
    setRepoUrl('');
    setDocs([]);
    setProjectTitle('');
    setReferences([]);
    setDocsLoaded(false);
    setNotice('');
    setError('');
  }

  async function connectRepo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedRepoUrl = repoUrl.trim();
    if (!normalizedRepoUrl) return;

    setError('');
    setNotice('Checking for existing Bobdock documentation.');

    try {
      const response = await fetch('/api/check-existing-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: normalizedRepoUrl, githubToken: token }),
      });
      const result = await response.json();

      setPendingRepoUrl(normalizedRepoUrl);

      if (result.success && result.exists && result.docsUrl) {
        setPendingDocsUrl(result.docsUrl);
        setShowExistingDocsModal(true);
        setNotice('Existing generated documentation found.');
        return;
      }

      setNotice('No generated documentation found. Choose repository context before generation.');
      await openFolderSelection(normalizedRepoUrl, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository documentation check failed.');
    }
  }

  function useExistingDocs() {
    const nextRepoUrl = pendingRepoUrl || repoUrl.trim();
    writeValue(storageKeys.repoUrl, nextRepoUrl);
    writeTokenCookie(token);
    setRepoUrl(nextRepoUrl);
    setStep('workspace');
    setActiveTab('context');
    setShowExistingDocsModal(false);
    setNotice('Existing documentation is now attached as workspace context.');
    void loadDocsList(nextRepoUrl);
  }

  function openExistingDocs() {
    writeTokenCookie(token);
    if (pendingDocsUrl) {
      window.location.assign(pendingDocsUrl);
    }
  }

  async function regenerateExistingDocs() {
    setShowExistingDocsModal(false);
    await openFolderSelection(pendingRepoUrl || repoUrl.trim(), readExistingDocs);
  }

  async function openFolderSelection(nextRepoUrl: string, shouldReadExistingDocs: boolean) {
    setPendingRepoUrl(nextRepoUrl);
    setReadExistingDocs(shouldReadExistingDocs);
    setRepoStructure({});
    setExcludedItems([]);
    setShowFolderModal(true);
    setLoadingStructure(true);
    setError('');

    try {
      const response = await fetch('/api/get-repo-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: nextRepoUrl, githubToken: token }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load repository structure.');
      }

      setRepoStructure(result.structure ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repository structure.');
    } finally {
      setLoadingStructure(false);
    }
  }

  function toggleExcludedItem(path: string) {
    setExcludedItems((current) =>
      current.includes(path) ? current.filter((item) => item !== path) : [...current, path]
    );
  }

  function selectAllRepoItems() {
    setExcludedItems([]);
  }

  async function confirmFolderSelection() {
    setShowFolderModal(false);
    await generateDocs(pendingRepoUrl || repoUrl.trim(), readExistingDocs, excludedItems);
  }

  async function generateDocs(nextRepoUrl = repoUrl, shouldReadExistingDocs = false, excludeItems = excludedItems) {
    const targetRepoUrl = nextRepoUrl.trim();

    if (!targetRepoUrl) return;

    setError('');
    setNotice('Starting documentation generation.');
    setIsGeneratingDocs(true);
    setDocsLoaded(false);
    writeValue(storageKeys.repoUrl, targetRepoUrl);
    writeTokenCookie(token);
    setRepoUrl(targetRepoUrl);
    setStep('workspace');
    setActiveTab('context');

    try {
      const response = await fetch('/api/generate-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: targetRepoUrl,
          githubUsername: username,
          githubToken: token,
          readExistingDocs: shouldReadExistingDocs,
          excludeItems,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success || !result.jobId) {
        throw new Error(result.error || 'Documentation generation could not start.');
      }

      const completed = await pollDocsJob(result.jobId);
      setNotice(`Documentation ready: ${completed.projectTitle || repoLabel || 'generated context'}.`);
      await loadDocsList(targetRepoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Documentation generation failed.');
    } finally {
      setIsGeneratingDocs(false);
    }
  }

  async function loadDocsList(repoUrlOverride = repoUrl) {
    const targetRepoUrl = repoUrlOverride.trim();
    if (!targetRepoUrl || !token) return;

    setLoadingDocs(true);
    setError('');

    try {
      const response = await fetch('/api/context-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: targetRepoUrl, githubToken: token }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Generated documentation could not be loaded.');
      }

      const nextDocs = result.docs ?? [];
      setDocs(nextDocs);
      setProjectTitle(result.project?.projectTitle ?? '');
      setDocsLoaded(true);

      if (nextDocs[0]?.path && (!selectedDoc || !nextDocs.some((doc: DocEntry) => doc.path === selectedDoc))) {
        await loadDoc(nextDocs[0].path, targetRepoUrl);
      }
    } catch (err) {
      setDocs([]);
      setProjectTitle('');
      setDocsLoaded(false);
      setError(err instanceof Error ? err.message : 'Generated documentation could not be loaded.');
    } finally {
      setLoadingDocs(false);
    }
  }

  async function loadDoc(path: string, repoUrlOverride = repoUrl) {
    const targetRepoUrl = repoUrlOverride.trim();
    setSelectedDoc(path);
    setSections([]);
    setDocMarkdown('');

    try {
      const response = await fetch('/api/context-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: targetRepoUrl, githubToken: token, docPath: path }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Documentation page could not be loaded.');
      }

      setSections(result.doc?.sections ?? []);
      setDocMarkdown(result.doc?.markdown ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Documentation page could not be loaded.');
    }
  }

  function attachReference(ref: ContextReference) {
    console.log('attachReference called with:', ref);
    
    setReferences((current) => {
      const exists = current.some(
        (item) => item.path === ref.path && (item.heading || '') === (ref.heading || '')
      );
      const newRefs = exists ? current : [...current, ref];
      console.log('References updated:', newRefs.length, 'total references');
      return newRefs;
    });

    const label = ref.heading ? `${ref.title} > ${ref.heading}` : ref.title;
    const marker = `[Context: ${label}]`;
    
    // If we have full markdown content (excerpt), include it in a visible format
    let insertion: string;
    if (ref.excerpt && ref.excerpt.trim()) {
      // Include the full markdown content directly in the spec
      // Add clear separators so it's visible and editable
      insertion = `\n\n---\n### ${marker}\n\n${ref.excerpt}\n\n---\n`;
      console.log('Inserting content with excerpt, length:', ref.excerpt.length);
    } else {
      // Fallback to simple reference if no content available
      insertion = `\n\n${marker} (${ref.path}${ref.heading ? `#${ref.heading}` : ''})\n`;
      console.log('Inserting simple reference (no excerpt)');
    }
    
    setSpec((current) => {
      const newSpec = `${current}${insertion}`;
      console.log('Spec updated, new length:', newSpec.length);
      return newSpec;
    });
    
    console.log('Switching to agents tab');
    setActiveTab('agents');
  }

  function removeReference(index: number) {
    setReferences((current) => current.filter((_, refIndex) => refIndex !== index));
  }

  async function dispatchTask() {
    setError('');
    setTaskOutput('');
    setTaskStatus('');
    setIsDispatching(true);

    try {
      const response = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          githubUsername: username,
          githubToken: token,
          role: selectedRole,
          title,
          spec,
          references,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success || !result.jobId) {
        throw new Error(result.error || 'Agent task could not be dispatched.');
      }

      setTaskStatus('queued');
      await pollTaskJob(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent task dispatch failed.');
    } finally {
      setIsDispatching(false);
    }
  }

  async function pollDocsJob(jobId: string) {
    for (;;) {
      await delay(1500);
      const response = await fetch(`/api/generate-docs/status?jobId=${encodeURIComponent(jobId)}`);
      const result = await response.json();

      if (!response.ok || result.status === 'failed') {
        throw new Error(result.error || 'Documentation generation failed.');
      }

      if (result.outputTail) {
        setNotice(lastLine(result.outputTail) || 'Bobdock is generating documentation.');
      }

      if (result.status === 'completed') {
        return result;
      }
    }
  }

  async function pollTaskJob(jobId: string) {
    for (;;) {
      await delay(2000);
      const response = await fetch(`/api/agent-tasks/status?jobId=${encodeURIComponent(jobId)}`);
      const result = await response.json();

      setTaskStatus(result.status || 'running');
      setTaskOutput(result.outputTail || result.errorTail || '');

      if (!response.ok || result.status === 'failed') {
        throw new Error(result.error || 'Agent task failed.');
      }

      if (result.status === 'completed') {
        setNotice(`${selectedAgent.name} completed the task.`);
        return result;
      }
    }
  }

  return (
    <main className="platform-shell">
      <TopBar
        repoLabel={step === 'workspace' ? repoLabel : ''}
        showReset={step !== 'credentials'}
        onReset={resetWorkspace}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {step === 'credentials' && (
        <IntakeScreen
          eyebrow="GitHub setup"
          title="Connect the repository system of record."
          description="Bobdock uses GitHub access to generate repository context, attach documentation fragments, and dispatch cloud Bob agents with enough detail to work without a local IDE."
        >
          <form className="workspace-panel intake-card" onSubmit={saveCredentials}>
            <PanelHeader title="GitHub credentials" detail="Saved locally in this browser for the workspace session." />
            <label>
              <span>GitHub username</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="octocat" autoComplete="username" required />
            </label>
            <label>
              <span>Personal access token</span>
              <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="github_pat_..." type="password" autoComplete="off" required />
            </label>
            <button className="primary-action" type="submit">Continue</button>
          </form>
        </IntakeScreen>
      )}

      {step === 'repository' && (
        <IntakeScreen
          eyebrow="Repository intake"
          title="Prepare generated context before dispatch."
          description="Connect a repo, reuse existing Bobdock documentation when available, or regenerate it with precise exclusions before handing tasks to agents."
        >
          <form className="workspace-panel intake-card" onSubmit={connectRepo}>
            <PanelHeader title="Repository" detail={`Connected as ${username}`} />
            <label>
              <span>GitHub repository URL</span>
              <input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/acme/product" type="url" required />
            </label>
            <button className="primary-action" type="submit">Check repository</button>
            {notice && <p className="notice-text">{notice}</p>}
            {error && <p className="error-text">{error}</p>}
          </form>
        </IntakeScreen>
      )}

      {step === 'workspace' && (
        <>
          <WorkspaceStatus notice={notice} error={error} />

          {activeTab === 'agents' ? (
            <AgentsPanel
              agents={agents}
              selectedAgent={selectedAgent}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              title={title}
              setTitle={setTitle}
              spec={spec}
              setSpec={setSpec}
              references={references}
              removeReference={removeReference}
              openContext={() => setActiveTab('context')}
              dispatchTask={dispatchTask}
              isDispatching={isDispatching}
              taskStatus={taskStatus}
              taskOutput={taskOutput}
              docsReady={docsReady}
            />
          ) : (
            <ContextPanel
              docs={docs}
              projectTitle={projectTitle}
              loadingDocs={loadingDocs}
              isGeneratingDocs={isGeneratingDocs}
              loadDocsList={loadDocsList}
              generateDocs={() => openFolderSelection(repoUrl, false)}
              attachReference={attachReference}
              docsUrl={projectDocsUrl(repoUrl)}
            />
          )}
        </>
      )}

      {showExistingDocsModal && (
        <Modal title="Documentation already exists" onClose={() => setShowExistingDocsModal(false)}>
          <p className="modal-copy">This repository already has generated Bobdock documentation. Use it immediately as agent context, open the docs site, or regenerate with fresh instructions.</p>
          <label className="check-row">
            <input type="checkbox" checked={readExistingDocs} onChange={(event) => setReadExistingDocs(event.target.checked)} />
            <span>When regenerating, read existing .bobdock documentation first</span>
          </label>
          <div className="modal-actions">
            <button className="primary-action" type="button" onClick={useExistingDocs}>Use as context</button>
            <button className="secondary-action" type="button" onClick={openExistingDocs}>Open docs</button>
            <button className="secondary-action" type="button" onClick={regenerateExistingDocs}>Regenerate</button>
          </div>
        </Modal>
      )}

      {showFolderModal && (
        <Modal title="Select documentation scope" onClose={() => setShowFolderModal(false)} wide>
          <p className="modal-copy">Everything checked will be analyzed by Bob. Uncheck generated, vendor, or irrelevant areas to keep context focused.</p>
          {loadingStructure ? (
            <div className="loading-block">Loading repository structure...</div>
          ) : (
            <RepoStructurePicker
              structure={repoStructure}
              excludedItems={excludedItems}
              toggleExcludedItem={toggleExcludedItem}
              selectAllRepoItems={selectAllRepoItems}
            />
          )}
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button className="secondary-action" type="button" onClick={() => setShowFolderModal(false)}>Cancel</button>
            <button className="primary-action" type="button" onClick={confirmFolderSelection} disabled={loadingStructure || isGeneratingDocs}>
              {excludedItems.length > 0 ? `Generate excluding ${excludedItems.length}` : 'Generate docs'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function TopBar({ repoLabel, showReset, onReset, activeTab, setActiveTab }: { repoLabel: string; showReset: boolean; onReset: () => void; activeTab: WorkspaceTab; setActiveTab: (tab: WorkspaceTab) => void }) {
  return (
    <nav className="workspace-nav">
      <a href="/" className="brand-link"><span>BD</span>Bobdock</a>
      {repoLabel && (
        <div className="workspace-tabs">
          <button className={activeTab === 'agents' ? 'active' : ''} type="button" onClick={() => setActiveTab('agents')}>Agents</button>
          <button className={activeTab === 'context' ? 'active' : ''} type="button" onClick={() => setActiveTab('context')}>Context</button>
        </div>
      )}
      <div className="nav-right">
        {repoLabel && <div className="repo-pill">{repoLabel}</div>}
        {showReset && <button className="reset-btn" type="button" onClick={onReset}>Reset GitHub</button>}
      </div>
    </nav>
  );
}

function IntakeScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="intake-grid">
      <div className="intake-copy">
        <p className="rail-label">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function PanelHeader({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
    </div>
  );
}

function WorkspaceStatus({ notice, error }: { notice: string; error: string }) {
  if (!notice && !error) return null;

  return (
    <div className={`status-strip ${error ? 'error' : ''}`}>
      {error || notice}
    </div>
  );
}

function AgentsPanel({
  agents,
  selectedAgent,
  selectedRole,
  setSelectedRole,
  title,
  setTitle,
  spec,
  setSpec,
  references,
  removeReference,
  openContext,
  dispatchTask,
  isDispatching,
  taskStatus,
  taskOutput,
  docsReady,
}: {
  agents: typeof agents;
  selectedAgent: (typeof agents)[number];
  selectedRole: AgentRole;
  setSelectedRole: (role: AgentRole) => void;
  title: string;
  setTitle: (value: string) => void;
  spec: string;
  setSpec: (value: string) => void;
  references: ContextReference[];
  removeReference: (index: number) => void;
  openContext: () => void;
  dispatchTask: () => void;
  isDispatching: boolean;
  taskStatus: string;
  taskOutput: string;
  docsReady: boolean;
}) {
  return (
    <section className="agents-layout">
      <aside className="agent-rail workspace-panel">
        <PanelHeader title="Agents" detail="Choose the behavior profile for this task." />
        <div className="agent-list">
          {agents.map((agent) => (
            <button
              key={agent.role}
              className={`agent-card-button ${selectedRole === agent.role ? 'selected' : ''}`}
              style={{ '--agent-accent': agent.accent } as React.CSSProperties}
              type="button"
              onClick={() => setSelectedRole(agent.role)}
            >
              <AgentAvatar agent={agent} size="sm" />
              <span>{agent.label}</span>
              <strong>{agent.name}</strong>
              <small>{agent.description}</small>
            </button>
          ))}
        </div>
      </aside>

      <div className="composer workspace-panel">
        <div className="composer-head">
          <AgentAvatar agent={selectedAgent} size="lg" />
          <div>
            <span style={{ color: selectedAgent.accent }}>{selectedAgent.name}</span>
            <h2>Task specification</h2>
            <p>{selectedAgent.guidance}</p>
          </div>
        </div>

        <div className="composer-grid">
          <label>
            <span>Task title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Implement repository-aware onboarding flow" />
          </label>
          <div className={`context-health ${docsReady ? 'ready' : ''}`}>
            <strong>{docsReady ? 'Context ready' : 'Context missing'}</strong>
            <span>{docsReady ? `${references.length} references attached` : 'Generate or load docs before dispatch'}</span>
          </div>
        </div>

        <label className="spec-label">
          <span>Detailed plan</span>
          <textarea
            value={spec}
            onChange={(event) => setSpec(event.target.value)}
            placeholder="State the goal, constraints, expected files or modules, acceptance criteria, and verification. Use the Context tab to insert generated documentation references into this spec."
          />
        </label>

        {references.length > 0 && (
          <div className="reference-row">
            {references.map((ref, index) => (
              <button key={`${ref.path}-${ref.heading ?? 'page'}`} className="reference-chip" type="button" onClick={() => removeReference(index)} title="Remove reference">
                {ref.heading ?? ref.title}
                <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>
        )}

        <div className="dispatch-row">
          <button className="primary-action" type="button" onClick={dispatchTask} disabled={isDispatching || !title.trim() || !spec.trim()}>
            {isDispatching ? 'Dispatching...' : `Dispatch ${selectedAgent.name}`}
          </button>
          {taskStatus && <span className="task-status">Status: {taskStatus}</span>}
        </div>
        {taskOutput && <pre className="task-output">{taskOutput}</pre>}
      </div>
    </section>
  );
}

function RepoStructurePicker({
  structure,
  excludedItems,
  toggleExcludedItem,
  selectAllRepoItems,
}: {
  structure: Record<string, RepoStructureItem>;
  excludedItems: string[];
  toggleExcludedItem: (path: string) => void;
  selectAllRepoItems: () => void;
}) {
  const names = Object.keys(structure).sort();

  if (!names.length) {
    return <div className="loading-block">No repository structure is available.</div>;
  }

  return (
    <div className="repo-picker">
      <div className="repo-picker-head">
        <span>{excludedItems.length ? `${excludedItems.length} excluded` : 'All items included'}</span>
        <button type="button" onClick={selectAllRepoItems}>Include all</button>
      </div>
      <div className="repo-tree">
        {names.map((name) => {
          const item = structure[name];
          const isExcluded = excludedItems.includes(name);

          return (
            <div key={name} className="repo-tree-group">
              <label className="check-row">
                <input type="checkbox" checked={!isExcluded} onChange={() => toggleExcludedItem(name)} />
                <span>{item.type === 'folder' ? 'Folder' : 'File'} / {name}</span>
              </label>
              {item.children.length > 0 && (
                <div className="repo-tree-children">
                  {item.children.map((child) => {
                    const path = `${name}/${child}`;
                    return (
                      <label key={path} className="check-row compact">
                        <input type="checkbox" checked={!excludedItems.includes(path)} onChange={() => toggleExcludedItem(path)} />
                        <span>{path}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentAvatar({ agent, size }: { agent: (typeof agents)[number]; size: 'sm' | 'lg' }) {
  return (
    <div className={`agent-avatar ${size}`} style={{ '--agent-accent': agent.accent } as React.CSSProperties}>
      <img src={bobAsset} alt="" />
      <span>{agent.mark}</span>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`platform-modal-box ${wide ? 'wide' : ''}`}>
        <div className="modal-title-row">
          <h2 id="modal-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function readValue(key: string) {
  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeValue(key: string, value: string) {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Keep the workspace usable without browser persistence.
  }
}

function removeValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // No-op.
  }
}

function writeTokenCookie(value: string) {
  document.cookie = `bobdock.github.token=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
}

function projectDocsUrl(repoUrl: string) {
  try {
    const url = new URL(repoUrl);
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    return `/project-docs/${owner}/${repo?.replace(/\.git$/i, '')}`;
  } catch {
    return '/';
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function lastLine(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1) || '';
}

function cleanExcerpt(markdown: string) {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
}
