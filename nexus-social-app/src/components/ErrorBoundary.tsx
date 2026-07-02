'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    eventId: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, eventId: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
    this.setState({ eventId });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-md w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Oops, something went wrong</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We've been notified and are looking into it. Please try refreshing the page or report the issue if it persists.
            </p>
            <div className="pt-4 flex flex-col space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Refresh Page
              </button>
              <button
                onClick={() => Sentry.showReportDialog({ eventId: this.state.eventId as string })}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition"
              >
                Report Issue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
