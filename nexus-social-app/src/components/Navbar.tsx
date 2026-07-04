'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LogIn, LogOut } from 'lucide-react';
import { listUserWorkspaces, type UserWorkspace } from '@/actions/ensure-workspace';
import { signOut } from '@/actions/auth';
import { supabase } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/store/workspace';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import LanguageToggle from '@/components/LanguageToggle';
import { isSaasUiEnabled } from '@/lib/feature-flags';

export default function Navbar() {
  const saasUi = isSaasUiEnabled();
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [current, setCurrent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningOut, startSignOut] = useTransition();
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const setSetupError = useWorkspaceStore((s) => s.setSetupError);
  const setNeedsDatabaseSetup = useWorkspaceStore((s) => s.setNeedsDatabaseSetup);
  const setBootstrapping = useWorkspaceStore((s) => s.setBootstrapping);
  const t = useTranslations('Navbar');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!saasUi) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    setBootstrapping(true);
    listUserWorkspaces()
      .then(({ workspaces: mapped, error, needsDatabaseSetup }) => {
        if (cancelled) return;
        setWorkspaceError(error ?? null);
        setSetupError(error ?? null);
        setNeedsDatabaseSetup(Boolean(needsDatabaseSetup));
        setWorkspaces(mapped);
        if (!needsDatabaseSetup && mapped.length) {
          const stored = useWorkspaceStore.getState().workspaceId;
          const activeId = stored && mapped.some((w) => w.id === stored) ? stored : mapped[0].id;
          setCurrent(activeId);
          setWorkspaceId(activeId);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load workspaces';
          setWorkspaceError(msg);
          setSetupError(msg);
          setNeedsDatabaseSetup(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [saasUi, setWorkspaceId, setSetupError, setNeedsDatabaseSetup, setBootstrapping]);

  const handleSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setCurrent(nextId);
    setWorkspaceId(nextId);
  };

  const handleSignOut = () => {
    startSignOut(async () => {
      useWorkspaceStore.getState().setWorkspaceId(null);
      await signOut();
    });
  };

  return (
    <header className="w-full min-h-16 bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg shadow-sm flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-6">
        <h1 className="text-xl font-semibold text-gray-800">
          {saasUi ? 'Nexus Social' : 'Nexus Enterprise'}
        </h1>
        {saasUi && (
          <>
            <div id="workspace-switcher" className="flex items-center space-x-2">
              <label htmlFor="workspace-select" className="text-sm text-gray-600 font-medium">
                {t('workspace')}:
              </label>
              <select
                id="workspace-select"
                value={current}
                onChange={handleSwitch}
                disabled={loading || workspaces.length === 0}
                aria-label={t('workspaceSelect')}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm min-w-[160px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
              >
                {loading && <option value="">Loading…</option>}
                {!loading && workspaces.length === 0 && <option value="">No workspace</option>}
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
            {workspaceError && (
              <span className="text-xs text-amber-600 max-w-xs" title={workspaceError}>
                {workspaceError}
              </span>
            )}
            <GlobalSearch />
          </>
        )}
      </div>

      <div className="flex items-center gap-3 ms-auto">
        <LanguageToggle />
        {userEmail && <NotificationBell />}
        {userEmail ? (
          <>
            <span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[200px]">
              {userEmail}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              <LogOut className="w-4 h-4" />
              {isSigningOut ? t('signingOut') : t('signOut')}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition"
          >
            <LogIn className="w-4 h-4" />
            {t('signIn')}
          </Link>
        )}
      </div>
    </header>
  );
}
