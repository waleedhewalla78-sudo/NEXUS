'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

type AiVerifyBannerProps = {
  initialOk?: boolean;
  initialMessage?: string;
};

export function AiVerifyBanner({ initialOk, initialMessage }: AiVerifyBannerProps) {
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    initialOk !== undefined
      ? { ok: initialOk, message: initialMessage ?? '' }
      : null,
  );

  useEffect(() => {
    if (initialOk !== undefined) return;

    fetch('/api/health/ai')
      .then((res) => res.json())
      .then((data: { ok?: boolean; message?: string }) => {
        setStatus({ ok: Boolean(data.ok), message: data.message ?? '' });
      })
      .catch(() => {
        setStatus({
          ok: false,
          message: 'Could not check AI status. Run npm run ai:verify locally.',
        });
      });
  }, [initialOk]);

  if (!status || status.ok) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div>
        <p className="font-medium">AI features may be unavailable</p>
        <p className="mt-1 text-amber-900">{status.message}</p>
      </div>
    </div>
  );
}
