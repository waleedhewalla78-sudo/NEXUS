// src/components/AISuggestModal.tsx
import * as Dialog from '@radix-ui/react-dialog';
import React, { useState } from 'react';
import { aiReply } from '@/actions/aiReply';
import { useWorkspaceStore } from '@/store/workspace';
import { toast } from 'react-hot-toast';

interface AISuggestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationHistory: { content: string }[];
  userQuery: string;
  onAccept: (suggestedReply: string) => void;
}

export default function AISuggestModal({
  open,
  onOpenChange,
  conversationHistory,
  userQuery,
  onAccept,
}: AISuggestModalProps) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId) ?? '';
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string>('');

  const handleGenerate = async () => {
    if (!workspaceId) {
      toast.error('Workspace not selected');
      return;
    }
    setLoading(true);
    try {
      const { reply } = await aiReply({
        workspaceId,
        conversationHistory,
        userQuery,
      });
      setSuggestion(reply);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white/90 backdrop-filter backdrop-blur-lg p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold mb-4">AI Suggested Reply</Dialog.Title>
          {loading ? (
            <p className="text-primary">Generating suggestion…</p>
          ) : suggestion ? (
            <div className="mb-4">
              <p className="whitespace-pre-wrap">{suggestion}</p>
            </div>
          ) : (
            <p className="text-gray-600 mb-4">Click the button to generate a reply.</p>
          )}
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">
                Cancel
              </button>
            </Dialog.Close>
            {!suggestion && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition"
              >
                {loading ? 'Generating…' : 'Generate'}
              </button>
            )}
            {suggestion && (
              <button
                type="button"
                onClick={() => {
                  onAccept(suggestion);
                  onOpenChange(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition"
              >
                Use Reply
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
