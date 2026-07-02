'use client';

import { useEffect } from 'react';
import { listUserWorkspaces } from '@/actions/ensure-workspace';
import { useWorkspaceStore } from '@/store/workspace';

export default function WorkspaceBootstrap() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const setSetupError = useWorkspaceStore((s) => s.setSetupError);
  const setNeedsDatabaseSetup = useWorkspaceStore((s) => s.setNeedsDatabaseSetup);
  const setBootstrapping = useWorkspaceStore((s) => s.setBootstrapping);

  useEffect(() => {
    if (workspaceId) return;

    setBootstrapping(true);
    listUserWorkspaces()
      .then(({ workspaces, error, needsDatabaseSetup }) => {
        setSetupError(error ?? null);
        setNeedsDatabaseSetup(Boolean(needsDatabaseSetup));
        if (needsDatabaseSetup) return;
        if (workspaces.length > 0) {
          setWorkspaceId(workspaces[0].id);
        }
      })
      .catch((err) => {
        setSetupError(err instanceof Error ? err.message : 'Failed to load workspace');
        setNeedsDatabaseSetup(false);
      })
      .finally(() => setBootstrapping(false));
  }, [workspaceId, setWorkspaceId, setSetupError, setNeedsDatabaseSetup, setBootstrapping]);

  return null;
}
