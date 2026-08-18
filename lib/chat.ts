import { api } from "@/lib/api";
import type { PaginationMeta } from "@/lib/users";

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

export type ChatMessageType = "text" | "image" | "video" | "audio" | "location" | "event" | "post";

export type ChatFileAttachment = {
  type: "image" | "video" | "audio";
  key: string;
  url?: string | null;
  mimeType: string;
  size: number;
  fileName?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
};

export type ChatLocationAttachment = {
  type: "location";
  latitude: number;
  longitude: number;
  label?: string | null;
  address?: string | null;
};

export type ChatEventAttachment = {
  type: "event";
  eventId: string;
  title?: string | null;
  scheduledAt?: string | null;
  endAt?: string | null;
  coverImageKey?: string | null;
  coverImageUrl?: string | null;
  locationName?: string | null;
  address?: string | null;
};

export type ChatPostAttachment = {
  type: "post";
  postId: string;
  preview?: string | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
};

export type ChatMessageAttachment = ChatFileAttachment | ChatLocationAttachment | ChatEventAttachment | ChatPostAttachment;

export type DirectChatMessageResponse = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  type: ChatMessageType;
  text: string;
  attachment?: ChatMessageAttachment | null;
  readAt: string | null;
  editedAt: string | null;
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
  type: ChatMessageType;
  text: string;
  attachment?: ChatMessageAttachment | null;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const getDirectMessageConversations = async (options: { includeHidden?: boolean } = {}): Promise<DirectMessageConversationResponse[]> => {
  const response = await api.get("/chat/dms", { params: options });
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

export const sendDirectMessage = async (
  friendId: string,
  payload: { text?: string; type?: ChatMessageType; attachment?: ChatMessageAttachment; clientMessageId?: string } | string,
): Promise<DirectChatMessageResponse> => {
  const body = typeof payload === "string" ? { text: payload } : payload;
  const response = await api.post(`/chat/dms/${friendId}/messages`, body);
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

export const deleteConversation = async (friendId: string): Promise<void> => {
  await api.delete(`/chat/dms/${encodeURIComponent(friendId)}`);
};

// Checks whether the current user is allowed to message friendId.
// Throws with a backend-provided reason if messaging is blocked.
export const checkDirectMessageAccess = async (friendId: string): Promise<void> => {
  await api.get(`/chat/dms/${encodeURIComponent(friendId)}/messages`, { params: { limit: 1 } });
};

export const getGroupMessages = async (
  groupId: string,
  options?: { before?: string; limit?: number },
): Promise<GroupMessageResponse[]> => {
  const response = await api.get(`/groups/${groupId}/messages`, { params: options });
  const messages = response.data?.data?.messages;

  return Array.isArray(messages) ? (messages as GroupMessageResponse[]) : [];
};

export const sendGroupMessage = async (
  groupId: string,
  payload: { text?: string; type?: ChatMessageType; attachment?: ChatMessageAttachment } | string,
): Promise<GroupMessageResponse> => {
  const body = typeof payload === "string" ? { text: payload } : payload;
  const response = await api.post(`/groups/${groupId}/messages`, body);
  const message = response.data?.data?.message;

  if (!message) {
    throw new Error("The group message response was incomplete.");
  }

  return message as GroupMessageResponse;
};

export type LeaveGroupResponse = {
  groupId: string;
  status: "left" | "group_deleted";
  newOwnerId?: string;
};

// Group-specific membership action — never reuse blockMessages/deleteConversation
// (both DM-only) for a group id. Backend is authoritative for ownership
// transfer / group deletion; this call carries no such logic itself.
export const leaveGroup = async (groupId: string): Promise<LeaveGroupResponse> => {
  const response = await api.post(`/groups/${encodeURIComponent(groupId)}/leave`);
  const leave = response.data?.data?.leave;

  if (!leave) {
    throw new Error("The leave group response was incomplete.");
  }

  return leave as LeaveGroupResponse;
};

// ── Message-only block (Chat-only restriction) ──────────────────────────
// Entirely separate from the Full/Profile block in @/lib/users.ts
// (blockUser/unblockUser/getBlockedUsers, which hit /users/:id/block and
// /users/me/blocked-users) — these hit the chat module's own
// /chat/dms/:friendId/message-block routes and manage a completely
// different, chat-only restriction. Do not merge these two.

export type MessageBlockStatusResponse = {
  userId: string;
  isMessageBlocked: boolean;
};

export type MessageBlockedUserResponse = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  blockedAt: string;
};

// Combined directional state for a single DM pair, in one request — see
// xenog-api chat.service.ts's getDirectMessageRelationship for why this
// lives on a chat-specific endpoint rather than extending GET /users/:id
// (avoids a user-module -> chat-module circular dependency).
export type DirectMessageRelationshipResponse = {
  fullBlockedByMe: boolean;
  fullBlockedMe: boolean;
  messageBlockedByMe: boolean;
  messageBlockedMe: boolean;
  canMessage: boolean;
};

const parseMessageBlockStatus = (payload: unknown, fallbackUserId: string): MessageBlockStatusResponse => {
  const block = payload as Partial<MessageBlockStatusResponse> | undefined;

  if (typeof block?.isMessageBlocked !== "boolean") {
    throw new Error("The message block response was incomplete.");
  }

  return {
    userId: typeof block.userId === "string" ? block.userId : fallbackUserId,
    isMessageBlocked: block.isMessageBlocked,
  };
};

export const blockMessages = async (friendId: string): Promise<MessageBlockStatusResponse> => {
  const response = await api.post(`/chat/dms/${encodeURIComponent(friendId)}/message-block`);
  return parseMessageBlockStatus(response.data?.data?.block, friendId);
};

export const unblockMessages = async (friendId: string): Promise<MessageBlockStatusResponse> => {
  const response = await api.delete(`/chat/dms/${encodeURIComponent(friendId)}/message-block`);
  return parseMessageBlockStatus(response.data?.data?.block, friendId);
};

export const getMessageBlockedUsers = async (
  page = 1,
  limit = 30,
): Promise<{ users: MessageBlockedUserResponse[]; pagination?: PaginationMeta }> => {
  const response = await api.get("/chat/dms/message-blocked", {
    params: { page, limit },
  });
  const users = response.data?.data?.users;

  return {
    users: Array.isArray(users) ? (users as MessageBlockedUserResponse[]) : [],
    pagination: response.data?.meta?.pagination as PaginationMeta | undefined,
  };
};

export const getDirectMessageRelationship = async (friendId: string): Promise<DirectMessageRelationshipResponse> => {
  const response = await api.get(`/chat/dms/${encodeURIComponent(friendId)}/relationship`);
  const relationship = response.data?.data?.relationship;

  if (!relationship) {
    throw new Error("The relationship response was incomplete.");
  }

  return relationship as DirectMessageRelationshipResponse;
};
