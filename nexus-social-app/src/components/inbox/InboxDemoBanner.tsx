'use client';

import { AlertCircle } from 'lucide-react';

export default function InboxDemoBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <p>
        <strong>Demo mode:</strong> Chatwoot is not connected. Showing sample conversations. Configure{' '}
        <code className="text-xs bg-amber-100 px-1 rounded">CHATWOOT_*</code> in{' '}
        <code className="text-xs bg-amber-100 px-1 rounded">.env.local</code> or connect channels in Settings.
      </p>
    </div>
  );
}
