'use client';

import { PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import WorkspaceBootstrap from '@/components/WorkspaceBootstrap';
import WorkspaceGate from '@/components/WorkspaceGate';

const MINIMAL_LAYOUT_PREFIXES = ['/login', '/setup', '/approve/', '/p/', '/_custom/', '/dashboard'];

export default function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? '';
  const isMinimal = MINIMAL_LAYOUT_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isMinimal) {
    return <>{children}</>;
  }

  return (
    <>
      <WorkspaceBootstrap />
      <Navbar />
      <div className="flex flex-1 overflow-hidden app-shell-row">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <WorkspaceGate>{children}</WorkspaceGate>
        </main>
      </div>
    </>
  );
}
