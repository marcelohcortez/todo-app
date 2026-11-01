"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error!, this.reset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-lg border border-danger-400/20 bg-surface-1 p-8 text-center max-w-md">
            <p className="text-lg font-semibold text-danger-300 mb-4">
              Something went wrong.
            </p>
            <button
              onClick={this.reset}
              className="rounded-md bg-danger-500/10 px-4 py-2 text-sm font-medium text-danger-300 hover:bg-danger-500/20 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="ml-3 rounded-md bg-surface-2 px-4 py-2 text-sm font-medium text-surface-100 hover:bg-surface-3 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
