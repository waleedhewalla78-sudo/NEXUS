// src/store/inbox.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface InboxState {
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
}

export const useInboxStore = create<InboxState>()(
  devtools((set) => ({
    selectedConversationId: null,
    setSelectedConversationId: (id) => set({ selectedConversationId: id })
  }))
);
