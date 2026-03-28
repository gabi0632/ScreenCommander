import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          gap: 16,
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '2rem',
            color: 'var(--red)',
          }}>
            ⚠
          </div>
          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: '1.25rem',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
          }}>
            שגיאה בלתי צפויה
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            maxWidth: 400,
          }}>
            משהו השתבש. נסה לרענן את הדף או לחץ על הכפתור למטה.
          </p>
          {this.state.error && (
            <pre style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              background: 'var(--bg-input)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              maxWidth: '100%',
              overflow: 'auto',
              direction: 'ltr',
              textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 24px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--bg-deep)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            נסה שוב
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
