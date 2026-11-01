import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, ShieldAlert, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error intercepted by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleCopyDiagnostics = () => {
    const { error, errorInfo } = this.state;
    const diagnosticReport = `--- INVESTXINDIA IFBMS ERROR DIAGNOSTIC REPORT ---
Timestamp: ${new Date().toISOString()} (IST: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})
Error Name: ${error?.name}
Error Message: ${error?.message}
Stack Trace:
${error?.stack || 'No stack trace available'}
Component Stack:
${errorInfo?.componentStack || 'No component stack'}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
--------------------------------------------------`;

    navigator.clipboard.writeText(diagnosticReport).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = () => {
    if (confirm('Perform safe system reset? This clears local cached states and reloads initial application data.')) {
      try {
        localStorage.removeItem('ifbms_transactions');
        localStorage.removeItem('ifbms_payouts');
      } catch (e) {
        console.warn('Could not clear local state:', e);
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-white">System Exception Intercepted</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  An unexpected UI runtime error occurred. Critical financial data remains intact.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-rose-400 overflow-x-auto max-h-40">
              <div className="font-semibold text-rose-300">
                {this.state.error?.name}: {this.state.error?.message}
              </div>
              {this.state.error?.stack && (
                <div className="mt-2 text-[11px] text-slate-500 whitespace-pre-wrap">
                  {this.state.error.stack.slice(0, 400)}...
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-md transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Application</span>
                </button>
                <button
                  onClick={this.handleCopyDiagnostics}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{this.state.copied ? 'Report Copied' : 'Copy Diagnostics'}</span>
                </button>
              </div>

              <button
                onClick={this.handleHardReset}
                className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
              >
                Safe State Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
