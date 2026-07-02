// src/components/ThemeProvider.tsx
'use client';
import { useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspace';

/**
 * ThemeProvider injects CSS variables based on the current workspace branding.
 * It also syncs the branding into the Zustand store for client‑side access.
 */
export default function ThemeProvider({
  branding = {},
  children,
}: {
  branding?: {
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
  };
  children: React.ReactNode;
}) {
  const setBranding = useWorkspaceStore((s) => s.setBranding);

  useEffect(() => {
    // Update Zustand store
    setBranding(branding);

    const root = document.documentElement;
    if (branding?.primary_color) {
      root.style.setProperty('--brand-primary', branding.primary_color);
    }
    if (branding.accent_color) {
      root.style.setProperty('--brand-accent', branding.accent_color);
    }
    if (branding.logo_url) {
      root.style.setProperty('--brand-logo', `url(${branding.logo_url})`);
    } else {
      root.style.removeProperty('--brand-logo');
    }
  }, [branding, setBranding]);

  return <>{children}</>;
}
