import React from 'react';

const agents = [
  {
    name: 'Implementor',
    icon: '⚡',
    description: 'General-purpose feature implementation engine',
    capabilities: [
      'Full-stack development',
      'API integration',
      'Database operations',
      'Feature implementation',
    ],
    badge: 'Core Development',
  },
  {
    name: 'Designer',
    icon: '🎨',
    description: 'Design-focused agent for UI/UX excellence',
    capabilities: [
      'Component design',
      'Responsive layouts',
      'Design systems',
      'Visual refinement',
    ],
    badge: 'UI/UX Focus',
  },
  {
    name: 'Debugger',
    icon: '🔍',
    description: 'Specialized in identifying and solving bugs',
    capabilities: [
      'Error diagnosis',
      'Performance issues',
      'Logic debugging',
      'Test coverage',
    ],
    badge: 'Bug Resolution',
  },
  {
    name: 'Reviewer',
    icon: '✓',
    description: 'Code review specialist finding gaps and improvements',
    capabilities: [
      'Code quality analysis',
      'Security review',
      'Best practices',
      'Architecture validation',
    ],
    badge: 'Quality Assurance',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Connect Repository',
    description: 'Link your GitHub repository to Bobdock. The platform automatically analyzes your codebase structure.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Generate Documentation',
    description: 'BobShell spins up in the cloud and creates intelligent, browsable documentation from your code.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Create Task with Context',
    description: 'Write your task specification, attach relevant documentation pages, and add directional context.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    step: '04',
    title: 'Dispatch to Agent',
    description: 'Choose the right agent for your task. They receive full context and execute with GitHub integration.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const features = [
  {
    title: 'Spec-Driven Development',
    description: 'Move from code-first to specification-first. Define what you want, let agents handle implementation.',
    icon: '📋',
  },
  {
    title: 'Context Management',
    description: 'Agents start with full project understanding. No wasted tokens on codebase comprehension.',
    icon: '🧠',
  },
  {
    title: 'GitHub Integration',
    description: 'Direct PR creation, commits, and repository operations. Seamless workflow integration.',
    icon: '🔗',
  },
  {
    title: 'MCP Connection',
    description: 'Model Context Protocol support for advanced agent capabilities and tool usage.',
    icon: '🔌',
  },
  {
    title: 'Cloud Execution',
    description: 'All agents run in the cloud. No local setup, no CLI complexity, no IDE required.',
    icon: '☁️',
  },
  {
    title: 'Team Collaboration',
    description: 'PMs, designers, and developers work together. Everyone contributes without technical barriers.',
    icon: '👥',
  },
];

const AgentsSection: React.FC = () => {
  return (
    <main style={{ background: '#fafafa' }}>
      {/* How It Works Section */}
      <section id="how-it-works" className="premium-section">
        <div className="premium-section-header">
          <div className="premium-section-eyebrow">The Workflow</div>
          <h2 className="premium-section-title">
            From repository to deployed feature in four steps
          </h2>
          <p className="premium-section-description">
            Bobdock streamlines the entire development process. Connect, generate, specify, and dispatch—all through an intuitive web interface.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {howItWorks.map((item, index) => (
            <article key={item.step} className="step-card" style={{ animationDelay: `${0.1 * index}s` }}>
              <div className="step-number">{item.step}</div>
              <div className="step-icon">
                {item.icon}
              </div>
              <h3 className="step-title">{item.title}</h3>
              <p className="step-description">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Agents Section */}
      <section id="agents" style={{ background: 'white', borderTop: '1px solid rgba(0, 0, 0, 0.08)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
        <div className="premium-section">
          <div className="premium-section-header">
            <div className="premium-section-eyebrow">Four Specialized Agents</div>
            <h2 className="premium-section-title">
              The right agent for every task
            </h2>
            <p className="premium-section-description">
              Each agent is powered by customizable markdown files that define their behavior, preferences, and project-specific context. You control how they work.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {agents.map((agent, index) => (
              <article key={agent.name} className="agent-card" style={{ animationDelay: `${0.1 * index}s` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div className="agent-icon">
                    {agent.icon}
                  </div>
                  <span className="agent-badge">{agent.badge}</span>
                </div>
                <h3 className="agent-name">{agent.name}</h3>
                <p className="agent-description">{agent.description}</p>
                <div className="capability-list">
                  {agent.capabilities.map((capability) => (
                    <div key={capability} className="capability-item">
                      <div className="capability-check">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>{capability}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '1rem 1.5rem',
              background: 'rgba(0, 113, 227, 0.05)',
              border: '1px solid rgba(0, 113, 227, 0.1)',
              borderRadius: '1rem',
              fontSize: '0.9375rem',
              color: '#6e6e73'
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#0071e3" strokeWidth="2">
                <circle cx="10" cy="10" r="8"/>
                <path d="M10 6v4M10 14h.01" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>
                Each agent references its own markdown configuration file that you control through the platform
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="premium-section">
        <div className="premium-section-header">
          <div className="premium-section-eyebrow">Platform Features</div>
          <h2 className="premium-section-title">
            Built for the future of software development
          </h2>
          <p className="premium-section-description">
            Bobdock isn't just another tool—it's a complete paradigm shift. Agentic coding that empowers everyone on your team.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
          marginTop: '3rem'
        }}>
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="feature-item"
              style={{
                animationDelay: `${0.1 * index}s`,
                gridColumn: index >= 4 ? 'span 1' : 'span 1'
              }}
            >
              <span className="feature-icon">{feature.icon}</span>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '0 1.5rem 5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="premium-cta">
            <h2 className="premium-cta-title">
              Ready to transform your development workflow?
            </h2>
            <p className="premium-cta-description">
              Join the future of agentic coding. No credit card required. Start dispatching agents in minutes.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <a href="/app" className="premium-btn premium-btn-primary" style={{ 
                fontSize: '1.0625rem', 
                padding: '0.875rem 1.75rem',
                background: 'white',
                color: '#1d1d1f'
              }}>
                Launch Bobdock
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a href="#how-it-works" className="premium-btn premium-btn-secondary" style={{ 
                fontSize: '1.0625rem', 
                padding: '0.875rem 1.75rem',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white'
              }}>
                See How It Works
              </a>
            </div>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '1.5rem',
              fontSize: '0.9375rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9L7.5 12.5L14 5" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>No local setup</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9L7.5 12.5L14 5" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>GitHub integration</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9L7.5 12.5L14 5" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>4 specialized agents</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AgentsSection;

// Made with Bob
