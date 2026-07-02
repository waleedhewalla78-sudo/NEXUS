// src/components/CreatePostDialog.tsx
'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import PostFormContent from '@/components/posts/PostFormContent';

interface CreatePostDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPost?: {
    id: string;
    content: { text: string; media_urls?: string[] };
    platforms: string[];
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    scheduled_at: string;
  };
  scheduledAt?: string;
}

export default function CreatePostDialog({ workspaceId, open, onOpenChange, existingPost, scheduledAt }: CreatePostDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-all" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#161622]/95 backdrop-filter backdrop-blur-xl p-8 shadow-2xl border border-white/10 z-50">
          <PostFormContent 
            workspaceId={workspaceId} 
            existingPost={existingPost} 
            scheduledAt={scheduledAt} 
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
