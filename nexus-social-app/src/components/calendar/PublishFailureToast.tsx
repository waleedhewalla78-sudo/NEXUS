'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { oauthReconnectPath } from '@/lib/oauth/reconnect-path';

type PublishFailureToastProps = {
  failedPosts: Array<{
    id: string;
    publish_error: string | null;
    platforms: string[] | null;
  }>;
  workspaceId: string;
};

export function PublishFailureToast({ failedPosts, workspaceId }: PublishFailureToastProps) {
  useEffect(() => {
    if (failedPosts.length === 0) return;

    const latest = failedPosts[0];
    const platform = latest.platforms?.[0] ?? 'social';
    const reconnect = oauthReconnectPath({ platform, workspaceId });

    toast.error(
      (t) => (
        <span>
          Publish failed ({platform}): {latest.publish_error ?? 'Unknown error'}.{' '}
          {reconnect ? (
            <Link href={reconnect} className="underline font-medium">
              Reconnect
            </Link>
          ) : (
            <Link href="/settings#nav-settings-channels" className="underline font-medium">
              Open settings
            </Link>
          )}
          <button type="button" onClick={() => toast.dismiss(t.id)} className="ml-2 text-xs opacity-70">
            Dismiss
          </button>
        </span>
      ),
      { duration: 8000, id: `publish-fail-${latest.id}` },
    );
  }, [failedPosts, workspaceId]);

  return null;
}
