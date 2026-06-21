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

export type GroupConversationResponse = {
  id: string;
  type: "group";
  name: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  memberCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdBy: string;
};

export type GroupMessageResponse = {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
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

export const getGroupConversations = async (): Promise<GroupConversationResponse[]> => {
  const response = await api.get("/groups");
  const groups = response.data?.data?.groups;

  return Array.isArray(groups) ? (groups as GroupConversationResponse[]) : [];
};

export const createGroup = async (payload: {
  name: string;
  memberIds: string[];
  avatarKey?: string | null;
}): Promise<GroupConversationResponse> => {
  const response = await api.post("/groups", payload);
  const group = response.data?.data?.group;

  if (!group) {
    throw new Error("Group creation response was incomplete.");
  }

  return group as GroupConversationResponse;
};

export const getGroupMessages = async (
  groupId: string,
  options?: { before?: string; limit?: number },
): Promise<GroupMessageResponse[]> => {
  const response = await api.get(`/groups/${groupId}/messages`, { params: options });
  const messages = response.data?.data?.messages;

  return Array.isArray(messages) ? (messages as GroupMessageResponse[]) : [];
};

export const sendGroupMessage = async (groupId: string, text: string): Promise<GroupMessageResponse> => {
  const response = await api.post(`/groups/${groupId}/messages`, { text });
  const message = response.data?.data?.message;

  if (!message) {
    throw new Error("The group message response was incomplete.");
  }

  return message as GroupMessageResponse;
};
