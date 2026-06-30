import type { DirectMessageConversationResponse } from "@/lib/chat";
import { create } from "zustand";

type DirectUnreadCounts = Record<string, number>;

const countUnreadConversations = (counts: DirectUnreadCounts) =>
  Object.values(counts).filter((count) => count > 0).length;

interface ChatUnreadState {
  activeDirectConversationId: string | null;
  directUnreadCounts: DirectUnreadCounts;
  unreadDirectConversationCount: number;
  clearAllDirectUnread: () => void;
  clearDirectUnread: (conversationId: string) => void;
  incrementDirectUnread: (conversationId: string) => void;
  setActiveDirectConversationId: (conversationId: string | null) => void;
  setDirectUnreadCountsFromConversations: (conversations: DirectMessageConversationResponse[]) => void;
}

export const useChatUnreadStore = create<ChatUnreadState>((set) => ({
  activeDirectConversationId: null,
  directUnreadCounts: {},
  unreadDirectConversationCount: 0,
  clearAllDirectUnread: () =>
    set({
      directUnreadCounts: {},
      unreadDirectConversationCount: 0,
    }),
  clearDirectUnread: (conversationId) =>
    set((state) => {
      if (!state.directUnreadCounts[conversationId]) {
        return state;
      }

      const nextCounts = { ...state.directUnreadCounts };
      delete nextCounts[conversationId];

      return {
        directUnreadCounts: nextCounts,
        unreadDirectConversationCount: countUnreadConversations(nextCounts),
      };
    }),
  incrementDirectUnread: (conversationId) =>
    set((state) => {
      if (state.activeDirectConversationId === conversationId) {
        return state;
      }

      const nextCounts = {
        ...state.directUnreadCounts,
        [conversationId]: (state.directUnreadCounts[conversationId] ?? 0) + 1,
      };

      return {
        directUnreadCounts: nextCounts,
        unreadDirectConversationCount: countUnreadConversations(nextCounts),
      };
    }),
  setActiveDirectConversationId: (conversationId) =>
    set({
      activeDirectConversationId: conversationId,
    }),
  setDirectUnreadCountsFromConversations: (conversations) => {
    const nextCounts = conversations.reduce<DirectUnreadCounts>((counts, conversation) => {
      const conversationId = conversation.friendId || conversation.id;

      if (conversationId && conversation.unreadCount > 0) {
        counts[conversationId] = conversation.unreadCount;
      }

      return counts;
    }, {});

    set({
      directUnreadCounts: nextCounts,
      unreadDirectConversationCount: countUnreadConversations(nextCounts),
    });
  },
}));
