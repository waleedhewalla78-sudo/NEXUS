// src/components/GlassLayout.tsx
import React from 'react';

export default function GlassLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white/30 backdrop-blur-lg rounded-xl shadow-xl p-6">
        {children}
      </div>
    </div>
  );
}
