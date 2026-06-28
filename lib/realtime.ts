import { api } from "@/lib/api";
import type { ChatMessageAttachment, ChatMessageType } from "@/lib/chat";
import type { NotificationItem } from "@/lib/notifications";

export type DirectRealtimeMessage = {
  clientMessageId?: string | null;
  conversationId: string;
  createdAt: string;
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  text: string;
  type?: ChatMessageType;
  attachment?: ChatMessageAttachment | null;
  editedAt?: string | null;
};

export type DirectTypingRealtimeEvent = {
  isTyping: boolean;
  recipientId: string;
  senderId: string;
  senderName: string;
  updatedAt: string;
};

export type LiveRealtimeMessage = {
  clientMessageId?: string | null;
  createdAt: string;
  id: string;
  senderAvatarUrl?: string | null;
  senderId: string;
  senderName: string;
  text: string;
};

export type GroupRealtimeMessage = {
  clientMessageId?: string | null;
  groupId: string;
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type?: ChatMessageType;
  attachment?: ChatMessageAttachment | null;
  createdAt: string;
  editedAt?: string | null;
};

export type DirectMessageDeletedRealtimeEvent = {
  conversationId: string;
  messageId: string;
};

export type GroupMessageDeletedRealtimeEvent = {
  groupId: string;
  messageId: string;
};

export type NotificationReadRealtimeEvent = {
  notificationId: string;
  unreadCount: number;
};

export type NotificationReadAllRealtimeEvent = {
  unreadCount: number;
};

type RealtimeEvent =
  | { type: "ready"; user: { id: string; name: string } }
  | { type: "dm:message"; message: DirectRealtimeMessage }
  | { type: "dm:message:updated"; message: DirectRealtimeMessage }
  | { type: "dm:message:deleted"; messageId: string; conversationId: string }
  | { type: "dm:typing"; typing: DirectTypingRealtimeEvent }
  | { type: "group:message"; message: GroupRealtimeMessage }
  | { type: "group:message:updated"; message: GroupRealtimeMessage }
  | { type: "group:message:deleted"; messageId: string; groupId: string }
  | { type: "live:message"; roomId: string; message: LiveRealtimeMessage }
  | { type: "notification:new"; notification: NotificationItem }
  | { type: "notification:read"; notificationId: string; unreadCount: number }
  | { type: "notification:read-all"; unreadCount: number }
  | { type: "user:online"; userId: string }
  | { type: "user:offline"; userId: string }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };

type RealtimeSocketOptions = {
  accessToken: string;
  onDirectMessage?: (message: DirectRealtimeMessage) => void;
  onDirectMessageDeleted?: (event: DirectMessageDeletedRealtimeEvent) => void;
  onDirectMessageUpdated?: (message: DirectRealtimeMessage) => void;
  onDirectTyping?: (typing: DirectTypingRealtimeEvent) => void;
  onError?: (error: { code?: string; message: string }) => void;
  onGroupMessage?: (message: GroupRealtimeMessage) => void;
  onGroupMessageDeleted?: (event: GroupMessageDeletedRealtimeEvent) => void;
  onGroupMessageUpdated?: (message: GroupRealtimeMessage) => void;
  onLiveMessage?: (roomId: string, message: LiveRealtimeMessage) => void;
  onNotification?: (notification: NotificationItem) => void;
  onNotificationRead?: (event: NotificationReadRealtimeEvent) => void;
  onNotificationsReadAll?: (event: NotificationReadAllRealtimeEvent) => void;
  onReady?: () => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
};

const buildRealtimeUrl = (accessToken: string) => {
  const apiBaseUrl = api.defaults.baseURL;

  if (!apiBaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL.");
  }

  const url = new URL(apiBaseUrl);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.searchParams.set("token", accessToken);

  return url.toString();
};

export const createRealtimeSocket = ({
  accessToken,
  onDirectMessage,
  onDirectMessageDeleted,
  onDirectMessageUpdated,
  onDirectTyping,
  onError,
  onGroupMessage,
  onGroupMessageDeleted,
  onGroupMessageUpdated,
  onLiveMessage,
  onNotification,
  onNotificationRead,
  onNotificationsReadAll,
  onReady,
  onUserOnline,
  onUserOffline,
}: RealtimeSocketOptions) => {
  const socket = new WebSocket(buildRealtimeUrl(accessToken));
  const pendingMessages: string[] = [];

  const sendPayload = (payload: unknown) => {
    const serializedPayload = JSON.stringify(payload);

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(serializedPayload);
      return;
    }

    pendingMessages.push(serializedPayload);
  };

  socket.onopen = () => {
    while (pendingMessages.length > 0 && socket.readyState === WebSocket.OPEN) {
      const payload = pendingMessages.shift();

      if (payload) {
        socket.send(payload);
      }
    }
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(String(event.data)) as RealtimeEvent;

      if (payload.type === "ready") {
        onReady?.();
        return;
      }

      if (payload.type === "dm:message") {
        onDirectMessage?.(payload.message);
        return;
      }

      if (payload.type === "dm:message:updated") {
        onDirectMessageUpdated?.(payload.message);
        return;
      }

      if (payload.type === "dm:message:deleted") {
        onDirectMessageDeleted?.({
          conversationId: payload.conversationId,
          messageId: payload.messageId,
        });
        return;
      }

      if (payload.type === "dm:typing") {
        onDirectTyping?.(payload.typing);
        return;
      }

      if (payload.type === "group:message") {
        onGroupMessage?.(payload.message);
        return;
      }

      if (payload.type === "group:message:updated") {
        onGroupMessageUpdated?.(payload.message);
        return;
      }

      if (payload.type === "group:message:deleted") {
        onGroupMessageDeleted?.({ groupId: payload.groupId, messageId: payload.messageId });
        return;
      }

      if (payload.type === "live:message") {
        onLiveMessage?.(payload.roomId, payload.message);
        return;
      }

      if (payload.type === "notification:new") {
        onNotification?.(payload.notification);
        return;
      }

      if (payload.type === "notification:read") {
        onNotificationRead?.({
          notificationId: payload.notificationId,
          unreadCount: payload.unreadCount,
        });
        return;
      }

      if (payload.type === "notification:read-all") {
        onNotificationsReadAll?.({
          unreadCount: payload.unreadCount,
        });
        return;
      }

      if (payload.type === "user:online") {
        onUserOnline?.(payload.userId);
        return;
      }

      if (payload.type === "user:offline") {
        onUserOffline?.(payload.userId);
        return;
      }

      if (payload.type === "error") {
        onError?.({ code: payload.code, message: payload.message });
      }
    } catch {
      onError?.({ message: "Invalid realtime response." });
    }
  };

  socket.onerror = () => {
    onError?.({ message: "Realtime connection error." });
  };

  return {
    close: () => socket.close(),
    joinLiveRoom: (roomId: string) => sendPayload({ roomId, type: "live:join" }),
    leaveLiveRoom: (roomId: string) => sendPayload({ roomId, type: "live:leave" }),
    sendDirectMessage: (
      recipientId: string,
      text: string,
      clientMessageId?: string,
      options?: { type?: ChatMessageType; attachment?: ChatMessageAttachment },
    ) =>
      sendPayload({
        attachment: options?.attachment,
        clientMessageId,
        messageType: options?.type,
        recipientId,
        text,
        type: "dm:message",
      }),
    sendDirectTyping: (recipientId: string, isTyping: boolean) =>
      sendPayload({
        isTyping,
        recipientId,
        type: "dm:typing",
      }),
    editDirectMessage: (messageId: string, text: string) =>
      sendPayload({ messageId, text, type: "dm:message:edit" }),
    deleteDirectMessage: (messageId: string) =>
      sendPayload({ messageId, type: "dm:message:delete" }),
    sendGroupMessage: (
      groupId: string,
      text: string,
      clientMessageId?: string,
      options?: { type?: ChatMessageType; attachment?: ChatMessageAttachment },
    ) =>
      sendPayload({
        attachment: options?.attachment,
        clientMessageId,
        groupId,
        messageType: options?.type,
        text,
        type: "group:message",
      }),
    editGroupMessage: (messageId: string, text: string) =>
      sendPayload({ messageId, text, type: "group:message:edit" }),
    deleteGroupMessage: (messageId: string) =>
      sendPayload({ messageId, type: "group:message:delete" }),
    sendLiveMessage: (roomId: string, text: string, clientMessageId?: string) =>
      sendPayload({
        clientMessageId,
        roomId,
        text,
        type: "live:message",
      }),
  };
};
