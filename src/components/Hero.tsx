import React from 'react';

const Hero: React.FC = () => {
  return (
    <>
      {/* Premium Navigation */}
      <nav className="premium-nav">
        <div className="premium-nav-content">
          <a href="/" className="premium-logo">
            <span className="premium-logo-mark">BD</span>
            Bobdock
          </a>
          <a href="/app" className="premium-btn premium-btn-primary">
            Launch Platform
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="premium-hero">
        <div className="premium-hero-content">
          <div style={{ maxWidth: '980px', margin: '0 auto', textAlign: 'center' }}>
            <div className="premium-eyebrow animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Cloud-Native Agentic Development
            </div>
            <h1 className="premium-headline animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Command, dispatch, and manage Bob agents in the cloud
            </h1>
            <p className="premium-subheadline animate-fade-in-up" style={{ animationDelay: '0.3s', margin: '0 auto 0.6rem' }}>
              Bobdock transforms software development into a spec-driven experience. Connect your repository, generate intelligent documentation, and dispatch specialized AI agents—all without touching a terminal or IDE.
            </p>
            
            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s', display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '4rem', flexWrap: 'wrap' }}>
              <a href="/app" className="premium-btn premium-btn-primary" style={{ fontSize: '1.0625rem', padding: '0.875rem 2rem' }}>
                Get Started
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: '0.5rem' }}>
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a href="#how-it-works" className="premium-btn premium-btn-secondary" style={{ fontSize: '1.0625rem', padding: '0.875rem 2rem' }}>
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="stats-grid animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="stat-item">
                <div className="stat-value">4</div>
                <div className="stat-label">Specialized Agents</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">100%</div>
                <div className="stat-label">Cloud-Based</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">Zero</div>
                <div className="stat-label">Local Setup</div>
              </div>
            </div>
          </div>

          {/* Visual Demo Card */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.6s', marginTop: '5rem', maxWidth: '1100px', margin: '5rem auto 0' }}>
            <div className="premium-card" style={{ padding: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ 
                    display: 'inline-block', 
                    padding: '0.375rem 0.875rem', 
                    background: 'rgba(52, 199, 89, 0.1)', 
                    color: '#34c759',
                    borderRadius: '980px',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    marginBottom: '0.75rem'
                  }}>
                    Repository Connected
                  </div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '600', color: '#1d1d1f', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                    acme/payments-api
                  </h2>
                  <p style={{ fontSize: '1rem', color: '#6e6e73', lineHeight: '1.5' }}>
                    Documentation generated. Ready to dispatch agents.
                  </p>
                </div>
                <div style={{ 
                  padding: '0.5rem 1rem', 
                  background: 'rgba(52, 199, 89, 0.1)', 
                  color: '#34c759',
                  borderRadius: '980px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  Live
                </div>
              </div>

              <div style={{ 
                background: 'rgba(0, 113, 227, 0.04)', 
                border: '1px solid rgba(0, 113, 227, 0.1)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span style={{ fontWeight: '600', color: '#1d1d1f' }}>Active Task</span>
                  <span style={{ 
                    padding: '0.375rem 0.875rem', 
                    background: 'rgba(0, 113, 227, 0.1)', 
                    color: '#0071e3',
                    borderRadius: '980px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    In Progress
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: '#1d1d1f', marginBottom: '0.25rem' }}>
                    Implement OAuth2 flow
                  </div>
                  <div style={{ fontSize: '0.9375rem', color: '#6e6e73' }}>
                    Agent: Implementor
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#86868b', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 5.5L3 13.5C3 14.0523 3.44772 14.5 4 14.5L12 14.5C12.5523 14.5 13 14.0523 13 13.5L13 5.5M3 5.5L3 3.5C3 2.94772 3.44772 2.5 4 2.5L6.5 2.5L8 4L12 4C12.5523 4 13 4.44772 13 5L13 5.5M3 5.5L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span>3 docs attached</span>
                    </div>
                    <span>•</span>
                    <span>GitHub integration active</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                {[
                  { icon: '📝', label: 'Spec-Driven', desc: 'Context-rich tasks' },
                  { icon: '🤖', label: 'AI Agents', desc: 'Specialized execution' },
                  { icon: '☁️', label: 'Cloud-Based', desc: 'No local setup' },
                  { icon: '🔗', label: 'GitHub', desc: 'Direct integration' },
                ].map((item) => (
                  <div key={item.label} style={{ 
                    background: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                    <p style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1d1d1f', marginBottom: '0.25rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.75rem', color: '#6e6e73' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Value Props */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.7s', marginTop: '4rem' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '2rem',
              background: 'white',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '1.25rem',
              padding: '2.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  margin: '0 auto 1rem',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 102, 204, 0.05) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0071e3'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1d1d1f', marginBottom: '0.5rem' }}>Smart Context</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0071e3', marginBottom: '0.5rem' }}>Auto-Docs</div>
                <div style={{ fontSize: '0.9375rem', color: '#6e6e73' }}>Generated documentation from your codebase</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  margin: '0 auto 1rem',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 102, 204, 0.05) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0071e3'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1d1d1f', marginBottom: '0.5rem' }}>Efficient Agents</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0071e3', marginBottom: '0.5rem' }}>Max Context</div>
                <div style={{ fontSize: '0.9375rem', color: '#6e6e73' }}>Agents start with full project understanding</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  margin: '0 auto 1rem',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 102, 204, 0.05) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0071e3'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1d1d1f', marginBottom: '0.5rem' }}>No Setup</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0071e3', marginBottom: '0.5rem' }}>Cloud-First</div>
                <div style={{ fontSize: '0.9375rem', color: '#6e6e73' }}>PMs and developers work together seamlessly</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;

// Made with Bob
