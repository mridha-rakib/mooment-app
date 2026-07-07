import { useTheme } from "@/hooks/useTheme";
import { requireBusinessAccountForEvent } from "@/lib/eventGuard";
import { getMyProfileEvents } from "@/lib/events";
import { useAuthStore } from "@/stores/authStore";
import {
  ChevronRight,
  PencilEdit01Icon,
  QrCodeIcon,
  Ticket02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AddOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenComplete?: () => void;
}

const OPTIONS = [
  {
    id: "moment",
    label: "New Post",
    description:
      "Share one to your followers in just about on event you're attending",
    icon: PencilEdit01Icon,
    color: "#54268F",
    bg: "#AFA9EC",
    route: "/post-screen/create-post",
  },
  {
    id: "event",
    label: "New Event",
    description: "Post a real-world experience",
    icon: Ticket02Icon,
    color: "#631C1C",
    bg: "#DE7777",
    route: "/create-event",
  },
  {
    id: "scan",
    label: "Scan QR",
    description: "Scan event ticket QR codes",
    icon: QrCodeIcon,
    color: "#0C447C",
    bg: "#85B7EB",
    route: "/event-screen/scan-qr",
  },
];

export default function AddOptionsModal({
  visible,
  onClose,
  onOpenComplete,
}: AddOptionsModalProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const dragOffsetRef = useRef(0);

  const translateY = useRef(new Animated.Value(0)).current;

  const completedProfileTypes = useAuthStore(
    (state) => state.completedProfileTypes,
  );
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [optionsEnabled, setOptionsEnabled] = React.useState(false);
  const optionPressLockRef = React.useRef(true);

  React.useEffect(() => {
    optionPressLockRef.current = true;
    setOptionsEnabled(false);
  }, [visible]);

  const handleModalShow = () => {
    optionPressLockRef.current = false;
    setOptionsEnabled(true);
    onOpenComplete?.();
  };

  const handleOption = async (optionId: string, route: string) => {
    if (optionPressLockRef.current) return;

    optionPressLockRef.current = true;
    setOptionsEnabled(false);

    if (optionId === "scan") {
      try {
        const profileEvents = await getMyProfileEvents();

        if (profileEvents.active.length === 0) {
          optionPressLockRef.current = false;
          setOptionsEnabled(true);
          return;
        }
      } catch {
        optionPressLockRef.current = false;
        setOptionsEnabled(true);
        return;
      }
    }

    if (optionId === "event") {
      onClose();
      requireBusinessAccountForEvent({
        user,
        completedProfileTypes,
        updateProfile,
        router,
        onReady: () => router.push(route as any),
      });
      return;
    }
    onClose();
    router.push(route as any);
  };

  const dragResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          dragOffsetRef.current = 0;
          translateY.stopAnimation();
        },
        onPanResponderMove: (_event, gesture) => {
          const nextOffset = Math.max(-72, Math.min(240, gesture.dy));
          dragOffsetRef.current = nextOffset;
          translateY.setValue(nextOffset);
        },
        onPanResponderRelease: (_event, gesture) => {
          const shouldClose =
            gesture.dy > 120 || gesture.vy > 0.9 || dragOffsetRef.current > 120;

          if (shouldClose) {
            onClose();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
      }),
    [onClose, translateY],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={handleModalShow}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[
          styles.overlay,
          { backgroundColor: isDark ? "#000000CC" : "rgba(0,0,0,0.4)" },
        ]}
        activeOpacity={1}
        onPress={onClose}
      >
        <BlurView
          intensity={60}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />

        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
          ]}
        >
          <View
            {...dragResponder.panHandlers}
            style={{
              backgroundColor: colors.backgroundSecondary,
            }}
          >
            <View style={[styles.handle, { backgroundColor: colors.text }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Select to proceed
            </Text>
          </View>

          <View style={styles.optionsList}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleOption(opt.id, opt.route)}
                activeOpacity={0.75}
                disabled={!optionsEnabled}
              >
                <View style={[styles.optionIcon, { backgroundColor: opt.bg }]}>
                  <HugeiconsIcon
                    icon={opt.icon}
                    size={22}
                    color={opt.color}
                    strokeWidth={1.5}
                  />
                </View>

                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    {opt.label}
                  </Text>
                  <Text
                    style={[styles.optionDesc, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {opt.description}
                  </Text>
                </View>

                <HugeiconsIcon
                  icon={ChevronRight}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  handle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 24,
    textAlign: "center",
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 20,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  optionText: {
    flex: 1,
    paddingRight: 8,
  },
  optionLabel: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
