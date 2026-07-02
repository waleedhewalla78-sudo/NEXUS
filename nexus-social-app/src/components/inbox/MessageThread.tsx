// src/components/inbox/MessageThread.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { fetchMessages, type InboxMessage } from '@/actions/inbox';
import { useWorkspaceStore } from '@/store/workspace';
import { useInboxStore } from '@/store/inbox';

export default function MessageThread() {
  const t = useTranslations('Inbox');
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const conversationId = useInboxStore((s) => s.selectedConversationId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading, isError, error } = useQuery<InboxMessage[]>({
    queryKey: ['messages', workspaceId, conversationId],
    queryFn: async () => {
      if (!workspaceId || !conversationId) return [];
      return await fetchMessages(workspaceId, conversationId);
    },
    enabled: !!workspaceId && !!conversationId,
    refetchInterval: 5000, // poll every 5 seconds
  });

  // Auto‑scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>{t('selectConversation')}</p>
      </div>
    );
  }

  if (isLoading) {
    // Simple skeleton for loading messages
    return (
      <div className="p-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400">{t('errorLoadingMessages')}: {(error as Error).message}</div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`mb-2 flex ${
            msg.sender === 'agent' ? 'inbox-message-row--agent' : 'inbox-message-row--customer'
          }`}
        >
          <div
            className={`inbox-bubble max-w-[70%] px-4 py-2 rounded-lg 
              ${msg.sender === 'agent'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
            `}
          >
            {msg.content}
            <div className="inbox-bubble-timestamp mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
