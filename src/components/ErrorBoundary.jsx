// ═══════════════════════════════════════════════════════════════════════════
// ErrorBoundary.jsx — Capture toutes les erreurs React, mode dégradé gracieux
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retries: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // En production : envoyer à Supabase logs (non bloquant)
    if (import.meta.env.PROD) {
      try {
        fetch(`https://oqmqmhxbpirrtjgfhbcp.supabase.co/functions/v1/log-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '' },
          body: JSON.stringify({ message: error.message, stack: error.stack?.slice(0,1000), component: errorInfo.componentStack?.slice(0,500), url: location.href }),
        }).catch(() => {});
      } catch (_) {}
    }
  }

  handleRetry = () => {
    this.setState(s => ({ hasError: false, error: null, errorInfo: null, retries: s.retries + 1 }));
  };

  render() {
    const { hasError, error, retries } = this.state;
    const { children, fallback, section = 'Cette section' } = this.props;

    if (!hasError) return children;

    // Fallback personnalisé ?
    if (fallback) return fallback({ error, retry: this.handleRetry });

    // Mode dégradé standard
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-orange-50 border border-orange-100 rounded-xl text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{section} est temporairement indisponible</h3>
          <p className="text-sm text-gray-500 mt-1">
            {retries === 0
              ? 'Un problème est survenu. Vous pouvez réessayer.'
              : 'Le problème persiste. Le reste de la plateforme fonctionne normalement.'}
          </p>
          {import.meta.env.DEV && error && (
            <pre className="text-xs text-left bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-24 text-red-600">
              {error.message}
            </pre>
          )}
        </div>
        <div className="flex gap-2">
          {retries < 2 && (
            <button onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition-colors">
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          )}
          <button onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Home className="w-4 h-4" /> Accueil
          </button>
        </div>
      </div>
    );
  }
}

// HOC pour wrapper facilement n'importe quelle page
export function withErrorBoundary(Component, options = {}) {
  return function WrappedWithBoundary(props) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook utilitaire pour les erreurs async (non-React)
export function useAsyncError() {
  const [, setError] = React.useState();
  return React.useCallback(err => {
    setError(() => { throw err; });
  }, []);
}

export default ErrorBoundary;
