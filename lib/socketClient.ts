import { io, type Socket } from "socket.io-client";
import { AppState, type AppStateStatus } from "react-native";
import { api } from "@/lib/api";
import type {
  ChatMessageAttachment,
  ChatMessageType,
  DirectChatMessageResponse,
  GroupMessageResponse,
} from "@/lib/chat";
import type { NotificationItem } from "@/lib/notifications";
import type {
  DirectMessageDeletedRealtimeEvent,
  DirectRealtimeMessage,
  DirectTypingRealtimeEvent,
  GroupMessageDeletedRealtimeEvent,
  GroupRealtimeMessage,
  NotificationReadAllRealtimeEvent,
  NotificationReadRealtimeEvent,
} from "@/lib/realtime";

/**
 * Single shared Socket.IO connection for the whole authenticated app
 * session — DM/group chat, presence, and notifications.
 *
 * Unlike the legacy `app/lib/realtime.ts` (raw WebSocket, still used
 * as-is by the live-room/event-chat feature — see that file's screens),
 * this module is a module-level singleton: `connect()` is called exactly
 * once, from the root layout, whenever there is an access token, and
 * every screen that needs realtime chat/notification events calls
 * `subscribe(handlers)` to attach/detach its own handlers on the SAME
 * connection instead of opening a new one.
 */

export type RealtimeHandlers = {
  onDirectMessage?: (message: DirectRealtimeMessage) => void;
  onDirectMessageDeleted?: (event: DirectMessageDeletedRealtimeEvent) => void;
  onDirectMessageUpdated?: (message: DirectRealtimeMessage) => void;
  onDirectTyping?: (typing: DirectTypingRealtimeEvent) => void;
  onGroupMessage?: (message: GroupRealtimeMessage) => void;
  onGroupMessageDeleted?: (event: GroupMessageDeletedRealtimeEvent) => void;
  onGroupMessageUpdated?: (message: GroupRealtimeMessage) => void;
  onNotification?: (notification: NotificationItem) => void;
  onNotificationRead?: (event: NotificationReadRealtimeEvent) => void;
  onNotificationsReadAll?: (event: NotificationReadAllRealtimeEvent) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
  onError?: (error: { code?: string; message: string }) => void;
  /** Fires after a *re*connect (not the first connect) — use to refetch
   * REST state that may have missed events while disconnected. */
  onReconnected?: () => void;
};

export type AckResult<T> =
  | { ok: true; message: T }
  | { ok: false; code?: string; message: string };

const ACK_TIMEOUT_MS = 8000;

const HANDLER_EVENT_MAP: Record<keyof RealtimeHandlers, string | null> = {
  onDirectMessage: "dm:message",
  onDirectMessageDeleted: "dm:message:deleted",
  onDirectMessageUpdated: "dm:message:updated",
  onDirectTyping: "dm:typing",
  onGroupMessage: "group:message",
  onGroupMessageDeleted: "group:message:deleted",
  onGroupMessageUpdated: "group:message:updated",
  onNotification: "notification:new",
  onNotificationRead: "notification:read",
  onNotificationsReadAll: "notification:read-all",
  onUserOnline: "user:online",
  onUserOffline: "user:offline",
  onError: "error",
  onReconnected: null, // synthetic, not a socket.io event name
};

let socket: Socket | null = null;
let currentAccessToken: string | null = null;
let hasConnectedOnce = false;
let appStateSubscription: { remove: () => void } | null = null;
const pendingSubscriptions: RealtimeHandlers[] = [];
const activeSubscriptions = new Set<RealtimeHandlers>();

const log = __DEV__
  ? (msg: string, data?: object) => console.log(`[SocketIO] ${msg}`, data !== undefined ? data : "")
  : () => {};

const buildSocketIOOrigin = (): string => {
  const apiBaseUrl = api.defaults.baseURL;

  if (!apiBaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL.");
  }

  const url = new URL(apiBaseUrl);
  return `${url.protocol}//${url.host}`;
};

const attachHandlerToSocket = (activeSocket: Socket, handlers: RealtimeHandlers): void => {
  for (const key of Object.keys(HANDLER_EVENT_MAP) as (keyof RealtimeHandlers)[]) {
    const eventName = HANDLER_EVENT_MAP[key];
    const handler = handlers[key];
    if (!eventName || !handler) continue;

    if (key === "onUserOnline" || key === "onUserOffline") {
      activeSocket.on(eventName, (payload: { userId: string }) => (handler as (userId: string) => void)(payload.userId));
    } else {
      activeSocket.on(eventName, handler as (...args: unknown[]) => void);
    }
  }
};

const detachHandlerFromSocket = (activeSocket: Socket, handlers: RealtimeHandlers): void => {
  for (const key of Object.keys(HANDLER_EVENT_MAP) as (keyof RealtimeHandlers)[]) {
    const eventName = HANDLER_EVENT_MAP[key];
    const handler = handlers[key];
    if (!eventName || !handler) continue;

    activeSocket.off(eventName, handler as (...args: unknown[]) => void);
  }
};

const flushPendingSubscriptions = (activeSocket: Socket): void => {
  while (pendingSubscriptions.length > 0) {
    const handlers = pendingSubscriptions.shift();
    if (!handlers) continue;
    activeSubscriptions.add(handlers);
    attachHandlerToSocket(activeSocket, handlers);
  }
};

const ensureAppStateListener = (): void => {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
    if (nextState === "active" && socket && !socket.connected) {
      log("App foregrounded — nudging reconnect");
      socket.connect();
    }
  });
};

export const connect = (accessToken: string): void => {
  if (socket && currentAccessToken === accessToken) {
    return;
  }

  if (socket && currentAccessToken !== accessToken) {
    // Token rotated (refresh/re-login) — reconnect with the new auth
    // instead of tearing down and losing subscribed handlers.
    currentAccessToken = accessToken;
    socket.auth = { token: accessToken };
    socket.disconnect().connect();
    return;
  }

  currentAccessToken = accessToken;

  let origin: string;
  try {
    origin = buildSocketIOOrigin();
  } catch (error) {
    log("Failed to resolve Socket.IO origin", { error });
    return;
  }

  socket = io(origin, {
    path: "/socket.io",
    auth: { token: accessToken },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
  });

  socket.on("connect", () => {
    log("Connected", { id: socket?.id });
    if (hasConnectedOnce) {
      for (const handlers of activeSubscriptions) {
        handlers.onReconnected?.();
      }
    }
    hasConnectedOnce = true;
    flushPendingSubscriptions(socket as Socket);
  });

  socket.on("connect_error", (error: Error) => {
    log("Connect error", { message: error.message });
  });

  socket.on("disconnect", (reason: string) => {
    log("Disconnected", { reason });
  });

  // Any subscriptions registered before this connect() call (or before the
  // very first connection) still need to be attached now that a socket
  // instance exists — connect events only re-flush on actual (re)connects.
  flushPendingSubscriptions(socket);
  for (const handlers of activeSubscriptions) {
    attachHandlerToSocket(socket, handlers);
  }

  ensureAppStateListener();
};

export const disconnect = (): void => {
  appStateSubscription?.remove();
  appStateSubscription = null;
  socket?.disconnect();
  socket = null;
  currentAccessToken = null;
  hasConnectedOnce = false;
  pendingSubscriptions.length = 0;
  activeSubscriptions.clear();
};

export const isConnected = (): boolean => Boolean(socket?.connected);

export const reconnect = (): void => {
  if (socket && !socket.connected) {
    socket.connect();
  }
};

/**
 * Attach `handlers` to the shared connection. Safe to call before
 * `connect()` has run — the handlers are queued and attached as soon as a
 * socket instance exists. Returns an unsubscribe function.
 */
export const subscribe = (handlers: RealtimeHandlers): (() => void) => {
  if (socket) {
    activeSubscriptions.add(handlers);
    attachHandlerToSocket(socket, handlers);
  } else {
    pendingSubscriptions.push(handlers);
  }

  return () => {
    activeSubscriptions.delete(handlers);
    const queuedIndex = pendingSubscriptions.indexOf(handlers);
    if (queuedIndex !== -1) {
      pendingSubscriptions.splice(queuedIndex, 1);
    }
    if (socket) {
      detachHandlerFromSocket(socket, handlers);
    }
  };
};

const emitWithAck = <T>(event: string, payload: unknown): Promise<AckResult<T>> => {
  if (!socket) {
    return Promise.resolve({ ok: false, message: "Not connected." });
  }

  return new Promise((resolve) => {
    socket!
      .timeout(ACK_TIMEOUT_MS)
      .emit(event, payload, (err: Error | null, response?: AckResult<T>) => {
        if (err) {
          resolve({ ok: false, message: "Realtime request timed out." });
          return;
        }
        resolve(response ?? { ok: false, message: "No response from server." });
      });
  });
};

// Ack payloads mirror the REST DTOs (DirectChatMessageResponse /
// GroupMessageResponse) returned by ChatService/GroupService — NOT the
// richer DirectRealtimeMessage/GroupRealtimeMessage broadcast shape (which
// additionally carries senderName/clientMessageId and is delivered via the
// normal onDirectMessage/onGroupMessage subscription, including back to the
// sender's own connection). The ack is only used to confirm success/failure
// and reconcile the optimistic message's id — it is not the message-render
// path.
export const sendDirectMessage = (
  recipientId: string,
  text: string,
  clientMessageId?: string,
  options?: { type?: ChatMessageType; attachment?: ChatMessageAttachment },
): Promise<AckResult<DirectChatMessageResponse>> =>
  emitWithAck("dm:message", {
    attachment: options?.attachment,
    clientMessageId,
    messageType: options?.type,
    recipientId,
    text,
  });

export const sendDirectTyping = (recipientId: string, isTyping: boolean): void => {
  socket?.emit("dm:typing", { isTyping, recipientId });
};

export const editDirectMessage = (
  messageId: string,
  text: string,
): Promise<AckResult<DirectChatMessageResponse>> => emitWithAck("dm:message:edit", { messageId, text });

export const deleteDirectMessage = (
  messageId: string,
): Promise<AckResult<DirectChatMessageResponse>> => emitWithAck("dm:message:delete", { messageId });

export const sendGroupMessage = (
  groupId: string,
  text: string,
  clientMessageId?: string,
  options?: { type?: ChatMessageType; attachment?: ChatMessageAttachment },
): Promise<AckResult<GroupMessageResponse>> =>
  emitWithAck("group:message", {
    attachment: options?.attachment,
    clientMessageId,
    groupId,
    messageType: options?.type,
    text,
  });

export const editGroupMessage = (
  messageId: string,
  text: string,
): Promise<AckResult<GroupMessageResponse>> => emitWithAck("group:message:edit", { messageId, text });

export const deleteGroupMessage = (messageId: string): Promise<AckResult<GroupMessageResponse>> =>
  emitWithAck("group:message:delete", { messageId });
