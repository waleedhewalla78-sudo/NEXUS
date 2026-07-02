// src/components/inbox/MessageComposer.tsx
'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { sendReply, type InboxMessage } from '@/actions/inbox';
import { aiReply } from '@/actions/aiReply';
import { useWorkspaceStore } from '@/store/workspace';
import { useInboxStore } from '@/store/inbox';
import { useInboxStore as useMessageStore } from '@/store/inbox'; // for reusing same store

export default function MessageComposer() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const conversationId = useInboxStore((s) => s.selectedConversationId);
  const setSelected = useInboxStore((s) => s.setSelectedConversationId);
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [hasAIDraft, setHasAIDraft] = useState(false);

  const handleSend = async () => {
    if (!workspaceId || !conversationId || !text.trim()) return;
    setIsSending(true);
    try {
      const result = await sendReply(workspaceId, conversationId, text.trim());
      if ((result as { demoMode?: boolean }).demoMode) {
        queryClient.setQueryData<InboxMessage[]>(
          ['messages', workspaceId, conversationId],
          (prev = []) => [
            ...prev,
            {
              id: `demo-${Date.now()}`,
              sender: 'agent',
              content: text.trim(),
              created_at: new Date().toISOString(),
            },
          ],
        );
        toast.success('Demo reply sent (Chatwoot not connected)');
      } else {
        await queryClient.invalidateQueries({ queryKey: ['messages', workspaceId, conversationId] });
      }
      setText('');
      setHasAIDraft(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setIsSending(false);
    }
  };

  const handleAI = async () => {
    if (!workspaceId || !conversationId) return;
    setIsAIGenerating(true);
    try {
      // Get last 5 messages from cache (or fetch quickly)
      const cached = queryClient.getQueryData<any[]>(['messages', workspaceId, conversationId]) || [];
      const lastFive = cached.slice(-5).map((msg) => ({ content: msg.content }));
      const { reply } = await aiReply({
        workspaceId,
        conversationHistory: lastFive,
        userQuery: lastFive.length ? lastFive[lastFive.length - 1].content : '',
      });
      setText(reply);
      setHasAIDraft(true);
    } catch (e) {
      console.error('AI reply error:', e);
    } finally {
      setIsAIGenerating(false);
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md sticky bottom-0">
      {hasAIDraft && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          AI-generated draft. Please review before sending.
        </p>
      )}
      <textarea
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        rows={3}
        placeholder="Type your reply…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isSending || isAIGenerating}
      />
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={handleAI}
          disabled={isAIGenerating || !conversationId}
          className={`px-4 py-2 rounded-md flex items-center gap-1 
            ${isAIGenerating ? 'bg-primary/30' : 'bg-primary text-white hover:bg-primary/80'}
          `}
        >
          {isAIGenerating ? (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          ) : (
            'AI Suggest'
          )}
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className={`px-4 py-2 rounded-md 
            ${!text.trim() || isSending ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/80'}
          `}
        >
          {isSending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
