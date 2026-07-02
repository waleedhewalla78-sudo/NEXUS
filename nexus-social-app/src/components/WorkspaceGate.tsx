'use client';

import { PropsWithChildren } from 'react';
import { useWorkspaceStore } from '@/store/workspace';
import WorkspaceSetupRequired, { isDatabaseSetupError } from '@/components/WorkspaceSetupRequired';

export default function WorkspaceGate({ children }: PropsWithChildren) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const setupError = useWorkspaceStore((s) => s.setupError);
  const needsDatabaseSetup = useWorkspaceStore((s) => s.needsDatabaseSetup);
  const bootstrapping = useWorkspaceStore((s) => s.bootstrapping);

  if (needsDatabaseSetup || isDatabaseSetupError(setupError)) {
    return <WorkspaceSetupRequired />;
  }

  if (!workspaceId) {
    if (bootstrapping) {
      return <p className="text-gray-500 mt-8 text-center">Setting up your workspace…</p>;
    }
    return (
      <p className="text-gray-500 mt-8 text-center">
        {setupError ?? 'No workspace available. Refresh the page or sign in again.'}
      </p>
    );
  }

  return <>{children}</>;
}
