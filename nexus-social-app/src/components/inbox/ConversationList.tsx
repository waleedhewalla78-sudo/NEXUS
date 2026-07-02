// src/components/inbox/ConversationList.tsx
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchConversations, type InboxConversation } from '@/actions/inbox';
import { useWorkspaceStore } from '@/store/workspace';
import { useInboxStore } from '@/store/inbox';

interface Conversation extends InboxConversation {}

export default function ConversationList() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const setSelected = useInboxStore((s) => s.setSelectedConversationId);

  const { data: conversations = [], isLoading, isError, error } = useQuery<Conversation[]>({
    queryKey: ['conversations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await fetchConversations(workspaceId);
    },
    enabled: !!workspaceId,
  });

  if (isLoading) {
    // Skeleton loader
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400">Error loading conversations: {(error as Error).message}</div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {conversations.map((conv) => {
        const isActive = String(conv.id) === String(selectedId);
        return (
          <button
            key={conv.id}
            onClick={() => setSelected(String(conv.id))}
            className={`flex items-center w-full p-2 mb-2 rounded-lg transition-colors 
              ${isActive ? 'bg-primary/20 dark:bg-primary/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
            `}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              {conv.contact.avatar_url ? (
                <img src={conv.contact.avatar_url} alt={conv.contact.name} className="w-full h-full rounded-full" />
              ) : (
                conv.contact.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-800 dark:text-gray-100">{conv.contact.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.last_message.content}</div>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
              {new Date(conv.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
