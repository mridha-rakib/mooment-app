import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/hooks/useTheme";
import type { EventStatus } from "@/lib/events";
import { getLiveRoomMessages, type LiveRoomMessage } from "@/lib/liveRooms";
import * as realtimeSocket from "@/lib/socketClient";
import { useAuthStore } from "@/stores/authStore";

type ChatTabProps = {
  eventId: string;
  eventName?: string;
  scheduledAt?: string | null;
  endAt?: string | null;
  eventStatus?: EventStatus;
  isDraftPreviewDisabled?: boolean;
  // Lets the parent Event Details ScrollView scroll the composer above the
  // keyboard — ChatTab is embedded mid-page inside that outer ScrollView, so
  // a local KeyboardAvoidingView alone cannot reposition it on screen (see
  // the keyboard-handling notes near the KeyboardAvoidingView below).
  onComposerFocus?: () => void;
};

export type ChatTabRefreshHandle = {
  refresh: () => Promise<void>;
  measureComposerInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

type DeliveryState = "sending" | "delivered" | "failed";

// Near-bottom threshold for smart auto-scroll: how close (in px) the user
// must be to the latest message for incoming realtime messages to
// auto-follow. Small and fixed relative to typical row height (~40-60px),
// not a large arbitrary value — big enough to absorb momentum/rounding from
// RN's onScroll, small enough that "near bottom" still means "next message
// is basically in view".
const NEAR_BOTTOM_THRESHOLD = 120;

type ChatMessage = {
  id: string;
  clientMessageId?: string | null;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  text: string;
  time: string;
  fromMe: boolean;
  deliveryState?: DeliveryState;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MESSAGES_LIST_HEIGHT = Math.max(280, SCREEN_HEIGHT * 0.43);
// chatHeader (~48) + messagesList (MESSAGES_LIST_HEIGHT) + inputBar (~72,
// incl. its own marginTop) — gives the KeyboardAvoidingView/chatContainer a
// concrete height so `messagesList`'s `flex: 1` has something bounded to
// flex within. Without this, a fixed-height ScrollView nested in a
// flex-column with no defined container height cannot shrink when the
// keyboard opens, which was the root cause of the composer staying hidden
// behind the keyboard (see the KeyboardAvoidingView usage below).
const CHAT_CONTAINER_HEIGHT = MESSAGES_LIST_HEIGHT + 120;

// Sourced from the main Chat's CHAT_COLORS (app/app/chat-screen/chat-detail.tsx)
// so Event Chat bubbles stay visually consistent with DM/Group chat: sender
// bubbles use the same accent purple, receiver bubbles the same dark surface,
// and both keep the shared 16px radius with a 2px "tail" corner.
const MESSAGE_COLORS = {
  senderBubble: "#5B3FD6",
  senderText: "#FFFFFF",
  receiverBubble: "#15151A",
  receiverBorder: "rgba(255,255,255,0.08)",
  receiverText: "#FFFFFF",
  failed: "#FF3B30",
};

const formatMessageTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatScheduledTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "soon";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const isEventStarted = (scheduledAt?: string | null): boolean => {
  if (!scheduledAt) {
    return false;
  }

  const date = new Date(scheduledAt);

  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

const isEventClosed = (eventStatus?: EventStatus, endAt?: string | null): boolean => {
  if (eventStatus === "completed" || eventStatus === "cancelled") {
    return true;
  }

  if (!endAt) {
    return false;
  }

  const date = new Date(endAt);

  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

// Used for both REST history rows and realtime broadcast messages — both
// resolve to the same LiveRoomMessage shape now that Event Chat sends over
// Socket.IO (previously these needed separate converters because the raw-ws
// broadcast payload had its own distinct shape).
const toChatMessage = (message: LiveRoomMessage, currentUserId?: string): ChatMessage => ({
  id: message.id,
  clientMessageId: message.clientMessageId ?? null,
  senderId: message.senderId,
  senderName: message.senderName,
  senderAvatarUrl: message.senderAvatarUrl ?? null,
  text: message.text,
  time: formatMessageTime(message.createdAt),
  fromMe: message.senderId === currentUserId,
  deliveryState: "delivered",
});

type MessageRowProps = {
  message: ChatMessage;
  showSender: boolean;
  spaced: boolean;
  isDark: boolean;
  textSecondaryColor: string;
  isDeliveredVisible: boolean;
  onRetry: (message: ChatMessage) => void;
  onToggleDelivered: (messageId: string) => void;
};

const MessageRow = React.memo(function MessageRow({
  message,
  showSender,
  spaced,
  isDark,
  textSecondaryColor,
  isDeliveredVisible,
  onRetry,
  onToggleDelivered,
}: MessageRowProps) {
  // Delivered = server persisted + Socket.IO ack/broadcast confirmed (see
  // sendRealtimeMessage below) — never receiver-side delivery/read receipts.
  const canToggleDelivered = message.fromMe && message.deliveryState === "delivered";

  return (
    <View
      style={[
        styles.msgWrapper,
        message.fromMe ? styles.msgWrapperMe : styles.msgWrapperThem,
        spaced ? { marginTop: 12 } : { marginTop: 4 },
      ]}
    >
      {showSender && (
        <View style={styles.senderRow}>
          {message.senderAvatarUrl ? (
            <Image source={{ uri: message.senderAvatarUrl }} style={styles.senderAvatar} />
          ) : (
            <View
              style={[
                styles.senderAvatar,
                styles.senderAvatarPlaceholder,
                { backgroundColor: isDark ? "#222" : "#DDD" },
              ]}
            >
              <Text style={[styles.senderAvatarInitial, { color: textSecondaryColor }]}>
                {message.senderName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.senderName, { color: textSecondaryColor }]}>{message.senderName}</Text>
        </View>
      )}
      <TouchableOpacity
        activeOpacity={canToggleDelivered ? 0.75 : 1}
        disabled={!canToggleDelivered}
        onPress={() => onToggleDelivered(message.id)}
        style={[
          styles.bubble,
          message.fromMe
            ? styles.bubbleMe
            : [styles.bubbleThem, { borderColor: MESSAGE_COLORS.receiverBorder }],
        ]}
      >
        <Text style={[styles.bubbleText, message.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {message.text}
        </Text>
        <Text style={[styles.bubbleTime, message.fromMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
          {message.time}
          {canToggleDelivered && isDeliveredVisible ? " · Delivered" : ""}
        </Text>
      </TouchableOpacity>
      {message.fromMe && message.deliveryState === "failed" && (
        <TouchableOpacity style={styles.failedRetryRow} activeOpacity={0.8} onPress={() => onRetry(message)}>
          <Feather name="refresh-cw" size={12} color={MESSAGE_COLORS.failed} />
          <Text style={[styles.failedRetryText, { color: MESSAGE_COLORS.failed }]}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const ChatTab = React.forwardRef<ChatTabRefreshHandle, ChatTabProps>(({
  eventId,
  eventName,
  scheduledAt,
  endAt,
  eventStatus,
  isDraftPreviewDisabled = false,
  onComposerFocus,
}, ref) => {
  const { colors, isDark } = useTheme();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // Own-message ids for which the "Delivered" label is currently revealed —
  // presentation-only, never sent to the server (see MessageRow's tap
  // handler).
  const [expandedDeliveryIds, setExpandedDeliveryIds] = useState<Set<string>>(new Set());
  const messagesListRef = useRef<ScrollView>(null);
  const composerRef = useRef<View>(null);
  // Whether the message viewport should auto-follow new content. Starts
  // true so the very first history render positions at the latest message;
  // afterwards it's driven by how close the user's scroll position is to
  // the bottom (see handleMessagesScroll) and force-set to true on the
  // user's own sends.
  const stickToBottomRef = useRef(true);
  // Guards the one-time "jump to latest" after initial history load so
  // later content-size changes (incoming messages, Delivered-label toggles,
  // optimistic->authoritative reconciliation) don't repeatedly force a jump
  // — see handleContentSizeChange.
  const hasPositionedInitialRef = useRef(false);

  const eventStarted = isEventStarted(scheduledAt);
  const eventClosed = isEventClosed(eventStatus, endAt);

  const loadMessages = useCallback(async ({
    isActive = () => true,
    showLoader = true,
  }: {
    isActive?: () => boolean;
    showLoader?: boolean;
  } = {}) => {
    if (isDraftPreviewDisabled) {
      if (isActive()) {
        setIsLoading(false);
        setHasAccess(null);
        setMessages([]);
      }
      return;
    }

    if (!eventStarted || eventClosed) {
      if (isActive()) {
        setIsLoading(false);
        setHasAccess(null);
        setMessages([]);
      }
      return;
    }

    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const history = await getLiveRoomMessages(eventId, { limit: 50 });

      if (!isActive()) {
        return;
      }

      setMessages(history.map((m) => toChatMessage(m, currentUser?.id)));
      setHasAccess(true);
    } catch {
      if (!isActive()) {
        return;
      }

      if (showLoader) {
        setMessages([]);
        setHasAccess(false);
      }
    } finally {
      if (isActive() && showLoader) {
        setIsLoading(false);
      }
    }
  }, [currentUser?.id, eventClosed, eventId, eventStarted, isDraftPreviewDisabled]);

  React.useImperativeHandle(ref, () => ({
    refresh: () => loadMessages({ showLoader: false }),
    measureComposerInWindow: (callback) => {
      composerRef.current?.measureInWindow(callback);
    },
  }), [loadMessages]);

  useEffect(() => {
    let isActive = true;

    void loadMessages({ isActive: () => isActive });

    return () => {
      isActive = false;
    };
  }, [loadMessages]);

  // Event Chat now rides the app's single shared Socket.IO connection
  // (app/lib/socketClient.ts) instead of opening its own raw WebSocket per
  // mount. joinLiveRoom/leaveLiveRoom explicitly manage this event's room;
  // onReconnected re-fetches history via the same REST path used on mount
  // (Socket.IO reconnecting does not replay events missed while
  // disconnected, and socketClient itself re-emits "live:join" for this
  // room before onReconnected fires — see socketClient.ts's "connect"
  // handler — so this refetch reads from an already-rejoined room).
  useEffect(() => {
    if (isDraftPreviewDisabled) {
      return;
    }

    if (!hasAccess || !eventStarted || eventClosed) {
      return;
    }

    if (!accessToken) {
      return;
    }

    let isActive = true;

    void realtimeSocket.joinLiveRoom(eventId).then((result) => {
      if (!isActive) {
        return;
      }

      // Only a server-confirmed denial (code === EVENT_CHAT_ACCESS_DENIED)
      // may lock the UI into "Check In Required". A failed ack with no code
      // is client-synthesized (socket not connected yet, ack timeout, no
      // response — see emitWithAck in socketClient.ts) and does not mean
      // the user's check-in was revoked. The join is still durable despite
      // this particular ack failing: socketClient records eventId as the
      // active live room and retries "live:join" on the next reconnect
      // (socketClient.ts's "connect" handler), so no explicit retry is
      // needed here — just don't misreport the transient failure as denial.
      if (!result.ok && result.code === "EVENT_CHAT_ACCESS_DENIED") {
        setHasAccess(false);
      }
    });

    const unsubscribe = realtimeSocket.subscribe({
      onLiveRoomMessage: (event) => {
        if (event.liveRoomId !== eventId) {
          return;
        }

        setMessages((prev) => {
          const serverMessage = toChatMessage(event.message, currentUser?.id);
          const existingIndex = prev.findIndex(
            (m) =>
              m.id === event.message.id ||
              (Boolean(event.message.clientMessageId) && m.clientMessageId === event.message.clientMessageId),
          );

          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = serverMessage;
            return next;
          }

          return [...prev, serverMessage];
        });
      },
      onReconnected: () => {
        void loadMessages({ showLoader: false });
      },
    });

    return () => {
      isActive = false;
      realtimeSocket.leaveLiveRoom(eventId);
      unsubscribe();
    };
  }, [accessToken, currentUser?.id, eventClosed, eventId, eventStarted, hasAccess, isDraftPreviewDisabled, loadMessages]);

  const scrollToBottom = useCallback((animated = true) => {
    messagesListRef.current?.scrollToEnd({ animated });
  }, []);

  const toggleDeliveredVisible = useCallback((messageId: string) => {
    setExpandedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // Tracks how close to the bottom the user's scroll position is so
  // incoming messages only auto-follow when the user is already near the
  // latest message (Problem 3: don't yank someone reading older history).
  const handleMessagesScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  // Content size changes on: initial history render, incoming realtime
  // messages, own optimistic sends, optimistic->authoritative reconciliation,
  // and Delivered-label toggles (row height changes). Only the first two (and
  // sends) should ever move the scroll position.
  const handleContentSizeChange = useCallback(() => {
    if (!hasPositionedInitialRef.current) {
      hasPositionedInitialRef.current = true;
      stickToBottomRef.current = true;
      scrollToBottom(false);
      return;
    }

    if (stickToBottomRef.current) {
      scrollToBottom(true);
    }
  }, [scrollToBottom]);

  // Keeps the latest message (and composer) visible when the keyboard opens
  // while the user is already following the bottom of the conversation —
  // resizing the message viewport (see chatContainer/messagesList styles)
  // otherwise leaves a gap below the last message without this nudge.
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(showEvent, () => {
      if (stickToBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(false));
      }
    });

    return () => subscription.remove();
  }, [scrollToBottom]);

  // Ack is only used to detect FAILURE quickly. Success reconciliation is
  // left to the onLiveRoomMessage broadcast-echo handler above, which
  // replaces the optimistic entry with the authoritative server message —
  // mirrors chat-detail.tsx's sendRealtimeMessage.
  const sendRealtimeMessage = useCallback((clientMessageId: string, text: string) => {
    const markFailed = () => {
      setMessages((prev) =>
        prev.map((item) =>
          item.clientMessageId === clientMessageId && item.deliveryState === "sending"
            ? { ...item, deliveryState: "failed" }
            : item,
        ),
      );
    };

    realtimeSocket
      .sendLiveRoomMessage(eventId, text, clientMessageId)
      .then((ack) => {
        if (!ack.ok) {
          markFailed();
          // A server-confirmed denial here means access was actually
          // revoked mid-session (ticket refunded, event ended) — the same
          // authoritative signal the join handler above locks the UI on.
          // Any other failure only marks this one message as failed.
          if (ack.code === "EVENT_CHAT_ACCESS_DENIED") {
            setHasAccess(false);
          }
        }
      })
      .catch(() => markFailed());
  }, [eventId]);

  const retryMessage = useCallback((message: ChatMessage) => {
    if (!message.clientMessageId) {
      return;
    }

    setMessages((prev) =>
      prev.map((item) => (item.id === message.id ? { ...item, deliveryState: "sending" } : item)),
    );

    sendRealtimeMessage(message.clientMessageId, message.text);
  }, [sendRealtimeMessage]);

  const sendMessage = () => {
    const text = inputText.trim();

    if (!text) {
      return;
    }

    if (isDraftPreviewDisabled || !hasAccess || !eventStarted || eventClosed) {
      return;
    }

    const clientMessageId = `evt-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: clientMessageId,
      clientMessageId,
      senderId: currentUser?.id ?? "",
      senderName: currentUser?.name ?? "You",
      senderAvatarUrl: null,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      fromMe: true,
      deliveryState: "sending",
    };

    // Own sends must always land the user on the latest message (Problem 3),
    // regardless of whether they'd scrolled up to read older history.
    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    sendRealtimeMessage(clientMessageId, text);
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const prevMsg = messages[index - 1];
      const showSender = !item.fromMe && (!prevMsg || prevMsg.fromMe || prevMsg.senderId !== item.senderId);
      const spaced = !prevMsg || prevMsg.fromMe !== item.fromMe;

      return (
        <MessageRow
          message={item}
          showSender={showSender}
          spaced={spaced}
          isDark={isDark}
          textSecondaryColor={colors.textSecondary}
          isDeliveredVisible={expandedDeliveryIds.has(item.id)}
          onRetry={retryMessage}
          onToggleDelivered={toggleDeliveredVisible}
        />
      );
    },
    [messages, isDark, colors.textSecondary, expandedDeliveryIds, retryMessage, toggleDeliveredVisible],
  );

  if (isDraftPreviewDisabled) {
    return (
      <View style={styles.stateContainer}>
        <View
          style={[
            styles.stateIconCircle,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={28}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.stateTitle, { color: colors.text }]}>
          Chat Available After Publication
        </Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Event chat will become available after this event is published.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (eventClosed) {
    return (
      <View style={styles.stateContainer}>
        <View
          style={[
            styles.stateIconCircle,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={28}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.stateTitle, { color: colors.text }]}>
          Chat Closed
        </Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Event chat is available only while the event is active.
        </Text>
      </View>
    );
  }

  if (!eventStarted) {
    return (
      <View style={styles.stateContainer}>
        <View
          style={[
            styles.stateIconCircle,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={28}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.stateTitle, { color: colors.text }]}>
          Chat Opens Soon
        </Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          The group chat will be available once the event starts
          {scheduledAt ? ` on ${formatScheduledTime(scheduledAt)}` : ""}.
        </Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.stateContainer}>
        <View
          style={[
            styles.stateIconCircle,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <Ionicons
            name="ticket-outline"
            size={28}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.stateTitle, { color: colors.text }]}>
          Check In Required
        </Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Check in with your event ticket to join the group chat with other
          attendees.
        </Text>
      </View>
    );
  }

  return (
    // ChatTab is embedded mid-page inside Event Details' own outer
    // ScrollView (event.tsx), not a full-screen chat surface — that's why
    // Android intentionally gets no `behavior` here. Despite the Activity's
    // `android:windowSoftInputMode="adjustResize"` (AndroidManifest.xml),
    // on-device measurement (event.tsx's outer ScrollView onLayout/onScroll)
    // shows this RN screen's laid-out height does NOT actually shrink when
    // the keyboard opens — Android's edge-to-edge window handling (default
    // since Expo SDK 54+/RN's new architecture) leaves adjustResize without
    // a window to resize, so relying on it (or KeyboardAvoidingView's height
    // compensation, which assumes the same resize) would do nothing here.
    // What actually keeps the composer visible on Android is the parent
    // Event Details ScrollView measuring this composer's real screen
    // position after the keyboard event and scrolling by the required
    // overlap against the keyboard's own reported height (see event.tsx's
    // scrollChatComposerIntoView). iOS has no window-resize equivalent
    // either, so it keeps "padding" here as its own local compensation.
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Chat Header */}
      <View
        style={[
          styles.chatHeader,
          {
            backgroundColor: isDark
              ? "rgba(17,17,17,0.8)"
              : colors.card,
          },
        ]}
      >
        <View style={styles.chatHeaderLeft}>
          <Ionicons name="chatbubbles" size={18} color={colors.primary} />
          <Text
            style={[styles.chatHeaderTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {eventName ?? "Event"} Chat
          </Text>
        </View>
        <View style={styles.chatHeaderRight}>
          <View style={[styles.liveDot, { backgroundColor: "#16D869" }]} />
          <Text style={[styles.liveText, { color: colors.textSecondary }]}>
            Live
          </Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={messagesListRef}
        style={[
          styles.messagesList,
          {
            backgroundColor: isDark
              ? "rgba(10,10,14,0.6)"
              : "rgba(0,0,0,0.02)",
          },
        ]}
        contentContainerStyle={
          messages.length === 0
            ? styles.messagesEmpty
            : styles.messagesContent
        }
        showsVerticalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleMessagesScroll}
        scrollEventThrottle={100}
        keyboardShouldPersistTaps="handled"
        // This message viewport is nested inside Event Details' outer page
        // ScrollView (same vertical axis). Without this, Android's touch
        // responder system hands vertical drags to the ANCESTOR ScrollView
        // by default, so touches here scrolled the whole page instead of
        // the conversation — the "stuck" chat reported on-device.
        // nestedScrollEnabled opts this ScrollView into Android's native
        // nested-scrolling protocol so it consumes the gesture first and
        // only yields to the outer page once it's scrolled to its own
        // top/bottom edge (RN's documented mechanism for exactly this
        // same-axis nested-ScrollView case; iOS ignores the prop and
        // already resolves nested vertical ScrollViews natively via UIKit).
        nestedScrollEnabled
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={32}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.emptyChatText, { color: colors.textSecondary }]}
            >
              No messages yet
            </Text>
            <Text
              style={[
                styles.emptyChatSubText,
                { color: colors.textSecondary },
              ]}
            >
              Be the first to say something!
            </Text>
          </View>
        ) : (
          messages.map((message, index) => (
            <React.Fragment key={message.id}>
              {renderMessage({ item: message, index })}
            </React.Fragment>
          ))
        )}
      </ScrollView>

      {/* Input Bar */}
      <View
        ref={composerRef}
        style={[
          styles.inputBar,
          { backgroundColor: isDark ? "#0e0d12" : colors.card },
        ]}
      >
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: isDark ? "#161616" : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            onFocus={onComposerFocus}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor: inputText.trim()
                ? colors.primary
                : isDark
                  ? "#222"
                  : "#DDD",
            },
          ]}
          onPress={sendMessage}
          activeOpacity={0.8}
          disabled={!inputText.trim()}
        >
          <Feather
            name="send"
            size={16}
            color={
              inputText.trim()
                ? isDark
                  ? "#0e0d12"
                  : "#FFF"
                : colors.textSecondary
            }
            style={{ marginLeft: -1, marginTop: 1 }}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
});

ChatTab.displayName = "ChatTab";

export default ChatTab;

const styles = StyleSheet.create({
  stateContainer: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  stateIconCircle: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    marginBottom: 4,
    width: 56,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stateText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  chatContainer: {
    marginTop: 16,
    gap: 0,
    // Bounded so messagesList's flex: 1 below has a definite height to
    // shrink within when KeyboardAvoidingView (iOS) or a future height
    // change reduces this container's height — a fixed-height ScrollView
    // can't shrink, which was the composer-under-keyboard root cause.
    height: CHAT_CONTAINER_HEIGHT,
  },
  chatHeader: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chatHeaderLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  chatHeaderTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  chatHeaderRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  liveDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "600",
  },
  messagesList: {
    borderRadius: 12,
    marginTop: 8,
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  messagesEmpty: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  emptyChat: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyChatSubText: {
    fontSize: 13,
  },
  msgWrapper: {
    maxWidth: "80%",
  },
  msgWrapperMe: {
    alignSelf: "flex-end",
  },
  msgWrapperThem: {
    alignSelf: "flex-start",
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  senderAvatar: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  senderAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  senderAvatarInitial: {
    fontSize: 9,
    fontWeight: "700",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMe: {
    backgroundColor: MESSAGE_COLORS.senderBubble,
    borderBottomRightRadius: 2,
  },
  bubbleThem: {
    backgroundColor: MESSAGE_COLORS.receiverBubble,
    borderTopLeftRadius: 2,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: MESSAGE_COLORS.senderText,
  },
  bubbleTextThem: {
    color: MESSAGE_COLORS.receiverText,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
  },
  bubbleTimeMe: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  bubbleTimeThem: {
    color: "#8E8E9B",
  },
  failedRetryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  failedRetryText: {
    fontSize: 11,
    fontWeight: "600",
  },
  inputBar: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputWrap: {
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: "center",
  },
  input: {
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
