'use client';

import ConversationList from '@/components/inbox/ConversationList';
import MessageThread from '@/components/inbox/MessageThread';
import MessageComposer from '@/components/inbox/MessageComposer';
import InboxDemoBanner from '@/components/inbox/InboxDemoBanner';
import { useQuery } from '@tanstack/react-query';
import { fetchConversations } from '@/actions/inbox';
import { useWorkspaceStore } from '@/store/workspace';

export default function InboxPageClient() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', workspaceId],
    queryFn: () => (workspaceId ? fetchConversations(workspaceId) : []),
    enabled: !!workspaceId,
  });
  const isDemo = conversations.some((c) => c.demoMode);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 overflow-hidden">
      {isDemo && <InboxDemoBanner />}
      <div className="flex flex-1 min-h-0 inbox-split-pane">
        <aside className="w-1/3 border-e border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg">
          <ConversationList />
        </aside>
        <section className="flex flex-col flex-1 bg-white/40 dark:bg-gray-900/40 backdrop-blur-lg">
          <MessageThread />
          <MessageComposer />
        </section>
      </div>
    </div>
  );
}
