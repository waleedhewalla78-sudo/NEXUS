'use client';

import { PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import WorkspaceBootstrap from '@/components/WorkspaceBootstrap';
import WorkspaceGate from '@/components/WorkspaceGate';
import { isSaasUiEnabled } from '@/lib/feature-flags';

const MINIMAL_LAYOUT_PREFIXES = ['/login', '/setup', '/approve/', '/p/', '/_custom/', '/dashboard'];

function isEnterpriseLandingPath(pathname: string): boolean {
  return pathname === '/enterprise' || pathname === '/enterprise/';
}

export default function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? '';
  const isMinimal =
    isEnterpriseLandingPath(pathname) ||
    MINIMAL_LAYOUT_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isMinimal) {
    return <>{children}</>;
  }

  const saasUi = isSaasUiEnabled();

  return (
    <>
      {saasUi && <WorkspaceBootstrap />}
      <Navbar />
      <div className="flex flex-1 overflow-hidden app-shell-row">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          {saasUi ? <WorkspaceGate>{children}</WorkspaceGate> : children}
        </main>
      </div>
    </>
  );
}
