import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#070F1E] text-white flex items-center justify-center p-6 text-center">
          <div className="max-w-sm w-full rounded-3xl bg-[#101C36] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="text-3xl">🏫</div>
            <h1 className="text-lg font-black text-[#F5B301]">
              Little Roses Academy
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              The portal encountered a display issue: {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.caches) {
                  window.caches
                    .keys()
                    .then((keys) => Promise.all(keys.map((k) => window.caches.delete(k))))
                    .finally(() => window.location.reload());
                } else {
                  globalThis.location.reload();
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F5B301] text-[#0A192F] font-black text-xs cursor-pointer"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
