import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/hooks/useTheme";
import { getEventTicketAccess } from "@/lib/events";
import { getLiveRoomMessages, type LiveRoomMessage } from "@/lib/liveRooms";
import { createRealtimeSocket, type LiveRealtimeMessage } from "@/lib/realtime";
import { useAuthStore } from "@/stores/authStore";

type ChatTabProps = {
  eventId: string;
  eventName?: string;
  scheduledAt?: string | null;
  isHostMode?: boolean;
};

type ChatMessage = {
  id: string;
  clientMessageId?: string | null;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  text: string;
  time: string;
  fromMe: boolean;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MESSAGES_LIST_HEIGHT = Math.max(280, SCREEN_HEIGHT * 0.43);

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

const toHistoryMessage = (message: LiveRoomMessage, currentUserId?: string): ChatMessage => ({
  id: message.id,
  senderId: message.senderId,
  senderName: message.senderName,
  senderAvatarUrl: message.senderAvatarUrl ?? null,
  text: message.text,
  time: formatMessageTime(message.createdAt),
  fromMe: message.senderId === currentUserId,
});

const toRealtimeMessage = (message: LiveRealtimeMessage, currentUserId?: string): ChatMessage => ({
  id: message.id,
  clientMessageId: message.clientMessageId ?? null,
  senderId: message.senderId,
  senderName: message.senderName,
  senderAvatarUrl: message.senderAvatarUrl ?? null,
  text: message.text,
  time: formatMessageTime(message.createdAt),
  fromMe: message.senderId === currentUserId,
});

const ChatTab = ({
  eventId,
  eventName,
  scheduledAt,
  isHostMode = false,
}: ChatTabProps) => {
  const { colors, isDark } = useTheme();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const realtimeRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const messagesScrollRef = useRef<ScrollView>(null);

  const eventStarted = isEventStarted(scheduledAt);

  const checkAccess = useCallback(async () => {
    if (isHostMode) {
      setHasAccess(true);
      return;
    }

    try {
      const { hasAccess: access } = await getEventTicketAccess(eventId);
      setHasAccess(access);
    } catch {
      setHasAccess(false);
    }
  }, [eventId, isHostMode]);

  const loadMessages = useCallback(async () => {
    try {
      const history = await getLiveRoomMessages(eventId, { limit: 50 });
      setMessages(history.map((m) => toHistoryMessage(m, currentUser?.id)));
    } catch {
      // Fail silently — show empty chat
    }
  }, [currentUser?.id, eventId]);

  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      setIsLoading(true);

      await checkAccess();

      if (!isActive) {
        return;
      }

      setIsLoading(false);
    };

    void initialize();

    return () => {
      isActive = false;
    };
  }, [checkAccess]);

  useEffect(() => {
    if (!hasAccess || !eventStarted) {
      return;
    }

    void loadMessages();
  }, [hasAccess, eventStarted, loadMessages]);

  useEffect(() => {
    if (!accessToken || !hasAccess || !eventStarted) {
      return;
    }

    const realtime = createRealtimeSocket({
      accessToken,
      onLiveMessage: (roomId, realtimeMessage) => {
        if (roomId !== eventId) {
          return;
        }

        setMessages((prev) => {
          const alreadyExists = prev.some(
            (m) =>
              m.id === realtimeMessage.id ||
              (Boolean(realtimeMessage.clientMessageId) &&
                m.clientMessageId === realtimeMessage.clientMessageId),
          );

          if (alreadyExists) {
            return prev;
          }

          return [...prev, toRealtimeMessage(realtimeMessage, currentUser?.id)];
        });
      },
    });

    realtime.joinLiveRoom(eventId);
    realtimeRef.current = realtime;

    return () => {
      realtime.leaveLiveRoom(eventId);
      realtime.close();

      if (realtimeRef.current === realtime) {
        realtimeRef.current = null;
      }
    };
  }, [accessToken, currentUser?.id, eventId, eventStarted, hasAccess]);

  const scrollToBottom = useCallback((animated = true) => {
    messagesScrollRef.current?.scrollToEnd({ animated });
  }, []);

  const sendMessage = () => {
    const text = inputText.trim();

    if (!text) {
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
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    realtimeRef.current?.sendLiveMessage(eventId, text, clientMessageId);
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const prevMsg = messages[index - 1];
      const showSender =
        !item.fromMe &&
        (!prevMsg || prevMsg.fromMe || prevMsg.senderId !== item.senderId);

      return (
        <View
          style={[
            styles.msgWrapper,
            item.fromMe ? styles.msgWrapperMe : styles.msgWrapperThem,
            !prevMsg || prevMsg.fromMe !== item.fromMe
              ? { marginTop: 12 }
              : { marginTop: 4 },
          ]}
        >
          {showSender && (
            <View style={styles.senderRow}>
              {item.senderAvatarUrl ? (
                <Image
                  source={{ uri: item.senderAvatarUrl }}
                  style={styles.senderAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.senderAvatar,
                    styles.senderAvatarPlaceholder,
                    { backgroundColor: isDark ? "#222" : "#DDD" },
                  ]}
                >
                  <Text
                    style={[
                      styles.senderAvatarInitial,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.senderName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={[styles.senderName, { color: colors.textSecondary }]}
              >
                {item.senderName}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.bubble,
              item.fromMe
                ? styles.bubbleMe
                : [
                    styles.bubbleThem,
                    {
                      borderColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.08)",
                    },
                  ],
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem,
              ]}
            >
              {item.text}
            </Text>
            <Text
              style={[
                styles.bubbleTime,
                item.fromMe ? styles.bubbleTimeMe : styles.bubbleTimeThem,
              ]}
            >
              {item.time}
            </Text>
          </View>
        </View>
      );
    },
    [messages, isDark, colors.textSecondary],
  );

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={colors.primary} />
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
          Ticket Required
        </Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Purchase a ticket for this event to join the group chat with other
          attendees.
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

  return (
    <View style={styles.chatContainer}>
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
        ref={messagesScrollRef}
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
        onContentSizeChange={() => scrollToBottom(false)}
        onLayout={() => scrollToBottom(false)}
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
    </View>
  );
};

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
    height: MESSAGES_LIST_HEIGHT,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMe: {
    backgroundColor: "#B2ABBA",
    borderBottomRightRadius: 2,
  },
  bubbleThem: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 2,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: "#0e0d12",
  },
  bubbleTextThem: {
    color: "#FFFFFF",
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
  },
  bubbleTimeMe: {
    color: "rgba(14, 13, 18, 0.5)",
  },
  bubbleTimeThem: {
    color: "#8E8E9B",
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
