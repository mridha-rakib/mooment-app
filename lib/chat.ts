import { api } from "@/lib/api";

export type DirectMessageConversationResponse = {
  id: string;
  type: "direct";
  friendId: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline: boolean;
  isBlocked: boolean;
};

export type DirectChatMessageResponse = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  type: "text";
  text: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const getDirectMessageConversations = async (): Promise<DirectMessageConversationResponse[]> => {
  const response = await api.get("/chat/dms");
  const dms = response.data?.data?.dms;

  return Array.isArray(dms) ? (dms as DirectMessageConversationResponse[]) : [];
};

export const getDirectMessageHistory = async (
  friendId: string,
  options?: { before?: string; limit?: number },
): Promise<DirectChatMessageResponse[]> => {
  const response = await api.get(`/chat/dms/${friendId}/messages`, {
    params: options,
  });
  const messages = response.data?.data?.messages;

  return Array.isArray(messages) ? (messages as DirectChatMessageResponse[]) : [];
};

export const sendDirectMessage = async (friendId: string, text: string): Promise<DirectChatMessageResponse> => {
  const response = await api.post(`/chat/dms/${friendId}/messages`, { text });
  const message = response.data?.data?.message;

  if (!message) {
    throw new Error("The message response was incomplete.");
  }

  return message as DirectChatMessageResponse;
};
