// src/context/BrandingContext.tsx
'use client';
import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { fetchWorkspaceBranding } from '@/lib/branding';
import { useWorkspaceStore } from '@/store/workspace';

interface Branding {
  logoUrl: string;
  brandColors: Record<string, string>;
}

const BrandingContext = createContext<Branding | undefined>(undefined);

export const BrandingProvider = ({ children }: PropsWithChildren) => {
  const [branding, setBranding] = useState<Branding>({ logoUrl: '', brandColors: {} });
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  useEffect(() => {
    if (!workspaceId) return;
    // Load branding once on client mount
    fetchWorkspaceBranding(workspaceId)
      .then((data) => {
        setBranding(data);
        // Apply CSS variables to document root
        const root = document.documentElement;
        Object.entries(data.brandColors).forEach(([key, value]) => {
          root.style.setProperty(`--brand-${key}`, value);
        });
      })
      .catch((err) => console.error('Branding load error:', err));
  }, [workspaceId]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
};
