import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Replace with your error reporting service (Sentry, etc.) when ready
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center gap-8">
        {/* Brand mark */}
        <p className="font-serif text-3xl text-primary tracking-widest">Claire Skiin</p>

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-[38px] text-amber-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            sentiment_dissatisfied
          </span>
        </div>

        {/* Message */}
        <div className="max-w-md">
          <h1 className="font-headline text-3xl text-on-surface mb-3">
            Something went wrong
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            An unexpected error occurred. Our team has been notified. Please return
            to the home page and try again.
          </p>

          {/* Dev-only error details */}
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="text-xs font-mono text-stone-400 cursor-pointer hover:text-stone-600">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-4 bg-stone-100 rounded-xl text-[10px] text-red-600 overflow-auto text-left max-h-48 whitespace-pre-wrap">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={this.handleReset}
            className="px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
          >
            Back to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 border border-outline/30 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-surface-container-low transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
}
