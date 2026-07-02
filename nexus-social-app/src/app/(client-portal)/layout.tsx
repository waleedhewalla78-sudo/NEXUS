import React from 'react';

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <header className="border-b border-white/10 bg-black/20 p-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Client Portal</h1>
          <div className="text-sm opacity-60">Read-Only Access</div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  );
}
