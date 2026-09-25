import { io, type Socket } from "socket.io-client";
import { AppState, type AppStateStatus } from "react-native";
import { api, refreshConfiguredAuthToken } from "@/lib/api";
import type {
  ChatMessageAttachment,
  ChatMessageType,
  DirectChatMessageResponse,
  GroupMessageResponse,
} from "@/lib/chat";
import type { LiveRoom, LiveRoomMessage } from "@/lib/liveRooms";
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
 * session — DM/group chat, Event Chat (live rooms), presence, and
 * notifications.
 *
 * The legacy `app/lib/realtime.ts` (raw WebSocket) still exists and is still
 * used as-is by the standalone Live Room (audio room) screen — see
 * live-room-screen.tsx — but Event Chat (ChatTab.tsx) has been cut over to
 * this connection. This module is a module-level singleton: `connect()` is
 * called exactly once, from the root layout, whenever there is an access
 * token, and every screen that needs realtime events calls
 * `subscribe(handlers)` to attach/detach its own handlers on the SAME
 * connection instead of opening a new one.
 */

export type LiveRoomRealtimeMessage = {
  liveRoomId: string;
  message: LiveRoomMessage;
};

export type RealtimeHandlers = {
  onDirectMessage?: (message: DirectRealtimeMessage) => void;
  onDirectMessageDeleted?: (event: DirectMessageDeletedRealtimeEvent) => void;
  onDirectMessageUpdated?: (message: DirectRealtimeMessage) => void;
  onDirectTyping?: (typing: DirectTypingRealtimeEvent) => void;
  onGroupMessage?: (message: GroupRealtimeMessage) => void;
  onGroupMessageDeleted?: (event: GroupMessageDeletedRealtimeEvent) => void;
  onGroupMessageUpdated?: (message: GroupRealtimeMessage) => void;
  onLiveRoomMessage?: (event: LiveRoomRealtimeMessage) => void;
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
const SOCKET_AUTH_ERROR_CODE = "AUTHENTICATION_REQUIRED";

const HANDLER_EVENT_MAP: Record<keyof RealtimeHandlers, string | null> = {
  onDirectMessage: "dm:message",
  onDirectMessageDeleted: "dm:message:deleted",
  onDirectMessageUpdated: "dm:message:updated",
  onDirectTyping: "dm:typing",
  onGroupMessage: "group:message",
  onGroupMessageDeleted: "group:message:deleted",
  onGroupMessageUpdated: "group:message:updated",
  onLiveRoomMessage: "live:message",
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
let rejectedAccessToken: string | null = null;
let hasConnectedOnce = false;
let appStateSubscription: { remove: () => void } | null = null;
// The Event Chat room currently joined (if any) — Socket.IO room membership
// does not survive a reconnect, so on "connect" (when hasConnectedOnce is
// already true, i.e. a *re*connect) we re-emit "live:join" for this room
// before the consumer's onReconnected fires, so its own REST refetch sees a
// live, re-authorized subscription rather than racing a stale one.
let activeLiveRoomId: string | null = null;
let authRecoveryAttempted = false;
let authRecoveryPromise: Promise<void> | null = null;
const pendingSubscriptions: RealtimeHandlers[] = [];
const activeSubscriptions = new Set<RealtimeHandlers>();
const registeredSocketListeners = new WeakMap<
  RealtimeHandlers,
  Partial<Record<keyof RealtimeHandlers, (...args: unknown[]) => void>>
>();

const log = __DEV__
  ? (msg: string, data?: object) => console.log(`[SocketIO] ${msg}`, data !== undefined ? data : "")
  : () => {};
const warn = (msg: string, data?: object): void => {
  console.warn(`[SocketIO] ${msg}`, data !== undefined ? data : "");
};

const buildSocketIOOrigin = (): string => {
  const apiBaseUrl = api.defaults.baseURL;

  if (!apiBaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL.");
  }

  const url = new URL(apiBaseUrl);
  return `${url.protocol}//${url.host}`;
};

const attachHandlerToSocket = (activeSocket: Socket, handlers: RealtimeHandlers): void => {
  const registeredListeners = registeredSocketListeners.get(handlers) ?? {};

  for (const key of Object.keys(HANDLER_EVENT_MAP) as (keyof RealtimeHandlers)[]) {
    const eventName = HANDLER_EVENT_MAP[key];
    const handler = handlers[key];
    if (!eventName || !handler) continue;

    const listener =
      registeredListeners[key] ??
      (key === "onUserOnline" || key === "onUserOffline"
        ? (...args: unknown[]) => {
            const payload = args[0] as { userId: string };
            (handler as (userId: string) => void)(payload.userId);
          }
        : (handler as (...args: unknown[]) => void));

    registeredListeners[key] = listener;
    activeSocket.on(eventName, listener);
  }

  registeredSocketListeners.set(handlers, registeredListeners);
};

const detachHandlerFromSocket = (activeSocket: Socket, handlers: RealtimeHandlers): void => {
  for (const key of Object.keys(HANDLER_EVENT_MAP) as (keyof RealtimeHandlers)[]) {
    const eventName = HANDLER_EVENT_MAP[key];
    const listener = registeredSocketListeners.get(handlers)?.[key];
    if (!eventName || !listener) continue;

    activeSocket.off(eventName, listener);
  }

  registeredSocketListeners.delete(handlers);
};

type SocketConnectError = Error & {
  data?: { code?: unknown };
};

const isAuthenticationConnectError = (error: SocketConnectError): boolean =>
  error.data?.code === SOCKET_AUTH_ERROR_CODE || error.message === "Authentication required";

const recoverSocketAuthentication = async (activeSocket: Socket, rejectedToken: string): Promise<void> => {
  try {
    log("Authentication recovery started");
    const refreshedToken = await refreshConfiguredAuthToken({ clearOnUnauthorized: true });

    if (socket !== activeSocket || currentAccessToken !== rejectedToken) {
      log("Authentication recovery cancelled because the socket session changed");
      return;
    }

    if (refreshedToken === rejectedToken) {
      throw new Error("Authentication refresh returned the rejected access token.");
    }

    currentAccessToken = refreshedToken;
    activeSocket.auth = { token: refreshedToken };
    log("Authentication refreshed; reconnecting");
    activeSocket.connect();
  } catch (error) {
    warn("Authentication recovery failed", {
      message: error instanceof Error ? error.message : "Unknown refresh failure",
    });
  }
};

const startSocketAuthenticationRecovery = (): void => {
  if (authRecoveryAttempted || authRecoveryPromise || !socket || !currentAccessToken) {
    return;
  }

  authRecoveryAttempted = true;
  const recovery = recoverSocketAuthentication(socket, currentAccessToken);
  authRecoveryPromise = recovery;
  void recovery.finally(() => {
    if (authRecoveryPromise === recovery) {
      authRecoveryPromise = null;
    }
  });
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
    if (
      nextState === "active" &&
      socket &&
      !socket.connected &&
      currentAccessToken !== rejectedAccessToken
    ) {
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
    rejectedAccessToken = null;
    authRecoveryAttempted = false;
    authRecoveryPromise = null;
    socket.auth = { token: accessToken };
    socket.disconnect().connect();
    return;
  }

  currentAccessToken = accessToken;
  rejectedAccessToken = null;
  authRecoveryAttempted = false;

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
    rejectedAccessToken = null;
    authRecoveryAttempted = false;
    log("Connected", { id: socket?.id });
    if (hasConnectedOnce && activeLiveRoomId) {
      const liveRoomId = activeLiveRoomId;
      void emitWithAck("live:join", { liveRoomId }).then((result) => {
        if (!result.ok) {
          warn("Failed to rejoin live room after reconnect", { liveRoomId, message: result.message });
        }
      });
    }
    if (hasConnectedOnce) {
      for (const handlers of activeSubscriptions) {
        handlers.onReconnected?.();
      }
    }
    hasConnectedOnce = true;
    flushPendingSubscriptions(socket as Socket);
  });

  socket.on("connect_error", (error: SocketConnectError) => {
    if (isAuthenticationConnectError(error)) {
      rejectedAccessToken = currentAccessToken;
      log("Connect rejected by authentication");
      startSocketAuthenticationRecovery();
      return;
    }

    log("Connect error", { category: "network_or_server", message: error.message });
  });

  socket.on("disconnect", (reason: string) => {
    log("Disconnected", { reason });
  });

  // Any subscriptions registered before this connect() call (or before the
  // very first connection) still need to be attached now that a socket
  // instance exists — connect events only re-flush on actual (re)connects.
  flushPendingSubscriptions(socket);

  ensureAppStateListener();
};

export const disconnect = (): void => {
  appStateSubscription?.remove();
  appStateSubscription = null;
  socket?.disconnect();
  socket = null;
  currentAccessToken = null;
  rejectedAccessToken = null;
  hasConnectedOnce = false;
  authRecoveryAttempted = false;
  authRecoveryPromise = null;
  activeLiveRoomId = null;
  pendingSubscriptions.length = 0;
  activeSubscriptions.clear();
};

export const isConnected = (): boolean => Boolean(socket?.connected);

export const reconnect = (): void => {
  if (socket && !socket.connected && currentAccessToken !== rejectedAccessToken) {
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

// Event Chat (live rooms). Unlike DM/group, join/leave are explicit —
// broadcasts only reach sockets currently joined to `live:<liveRoomId>` on
// the server. joinLiveRoom also records the room so a *re*connect
// automatically re-emits "live:join" (see the "connect" handler above)
// before the caller's onReconnected fires.
export const joinLiveRoom = (liveRoomId: string): Promise<AckResult<LiveRoom>> => {
  activeLiveRoomId = liveRoomId;
  return emitWithAck("live:join", { liveRoomId });
};

export const leaveLiveRoom = (liveRoomId: string): void => {
  if (activeLiveRoomId === liveRoomId) {
    activeLiveRoomId = null;
  }
  socket?.emit("live:leave", { liveRoomId });
};

export const sendLiveRoomMessage = (
  liveRoomId: string,
  text: string,
  clientMessageId?: string,
): Promise<AckResult<LiveRoomMessage>> => emitWithAck("live:message", { liveRoomId, text, clientMessageId });
