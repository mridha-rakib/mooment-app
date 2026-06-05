import Constants from "expo-constants";

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined);

export type DirectRealtimeMessage = {
  clientMessageId?: string | null;
  conversationId: string;
  createdAt: string;
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  text: string;
  type?: "text";
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

type RealtimeEvent =
  | { type: "ready"; user: { id: string; name: string } }
  | { type: "dm:message"; message: DirectRealtimeMessage }
  | { type: "dm:typing"; typing: DirectTypingRealtimeEvent }
  | { type: "live:message"; roomId: string; message: LiveRealtimeMessage }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };

type RealtimeSocketOptions = {
  accessToken: string;
  onDirectMessage?: (message: DirectRealtimeMessage) => void;
  onDirectTyping?: (typing: DirectTypingRealtimeEvent) => void;
  onError?: (error: { code?: string; message: string }) => void;
  onLiveMessage?: (roomId: string, message: LiveRealtimeMessage) => void;
  onReady?: () => void;
};

const buildRealtimeUrl = (accessToken: string) => {
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
  onDirectTyping,
  onError,
  onLiveMessage,
  onReady,
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

      if (payload.type === "dm:typing") {
        onDirectTyping?.(payload.typing);
        return;
      }

      if (payload.type === "live:message") {
        onLiveMessage?.(payload.roomId, payload.message);
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
    sendDirectMessage: (recipientId: string, text: string, clientMessageId?: string) =>
      sendPayload({
        clientMessageId,
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
    sendLiveMessage: (roomId: string, text: string, clientMessageId?: string) =>
      sendPayload({
        clientMessageId,
        roomId,
        text,
        type: "live:message",
      }),
  };
};
