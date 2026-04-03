import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Auto-reload once on first error (handles stale SW cache in dev mode)
    const key = 'pismozones-error-reload';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
      return;
    }
    // Already tried once this session, show the error UI
    sessionStorage.removeItem(key);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          background: '#0f0f11',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            maxWidth: '360px',
            padding: '2rem',
            borderRadius: '20px',
            background: 'rgba(28,28,30,0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '0.85rem', opacity: 0.5, lineHeight: 1.5, marginBottom: '1.5rem' }}>
              An unexpected error occurred. Reload the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                borderRadius: '50px',
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                color: '#60a5fa',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
