import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  createEventReward,
  getEventById,
  updateEventReward,
  type EventResponse,
  type EventRewardPayload,
  type EventRewardType,
} from "@/lib/events";
import { getMyProducts, type Product } from "@/lib/products";
import { getStorageFileUrl } from "@/lib/storage";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const isRewardType = (value: unknown): value is EventRewardType =>
  value === "ticket" || value === "product";

const startOfToday = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const getInitialRewardDate = (reward?: EventRewardPayload | null, event?: EventResponse | null) => {
  const source = reward?.expiresAt ?? event?.scheduledAt ?? null;
  const parsed = source ? new Date(source) : null;

  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  fallback.setSeconds(0, 0);

  return fallback;
};

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value: Date) =>
  value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
  });

const getProductImageUri = (product?: Product | null) => {
  const key = product?.imageKeys?.[0];

  if (!key) {
    return null;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return null;
  }
};

type SelectorItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUri?: string | null;
};

export default function RewardDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; rewardId?: string; rewardType?: string }>();
  const { colors, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const rewardId = typeof params.rewardId === "string" ? params.rewardId : null;
  const rewardType: EventRewardType = isRewardType(params.rewardType) ? params.rewardType : "product";
  const isProductReward = rewardType === "product";
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [offerName, setOfferName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState(() => getInitialRewardDate());
  const [discountPercent, setDiscountPercent] = useState("4");
  const [buyQuantity, setBuyQuantity] = useState("1");
  const [freeQuantity, setFreeQuantity] = useState("1");
  const [capacity, setCapacity] = useState("185");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Record<string, React.ElementRef<typeof View> | null>>({});
  const activeFieldRef = useRef<string | null>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const keyboardTopRef = useRef(windowHeight);
  const footerHeightRef = useRef(0);

  const reward = useMemo(
    () => event?.rewards.find((item) => item.id === rewardId) ?? null,
    [event?.rewards, rewardId],
  );

  const selectorItems: SelectorItem[] = useMemo(() => {
    if (isProductReward) {
      return products.map((product) => ({
        id: product.id,
        title: product.name,
        subtitle: product.description,
        imageUri: getProductImageUri(product),
      }));
    }

    return (event?.tickets ?? []).map((ticket) => ({
      id: ticket.id ?? ticket.name,
      title: ticket.name,
      subtitle: ticket.description,
    }));
  }, [event?.tickets, isProductReward, products]);

  const selectedTarget = useMemo(
    () => selectorItems.find((item) => item.id === selectedTargetId) ?? null,
    [selectedTargetId, selectorItems],
  );

  const ensureFieldVisible = useCallback(
    (field: string) => {
      const fieldRef = fieldRefs.current[field];

      if (!fieldRef) {
        return;
      }

      requestAnimationFrame(() => {
        fieldRef.measureInWindow((_, fieldY, __, fieldHeight) => {
          const visibleBottom =
            (keyboardHeightRef.current > 0 ? keyboardTopRef.current : windowHeight) - footerHeightRef.current - 24;
          const fieldBottom = fieldY + fieldHeight + 16;
          const delta = fieldBottom - visibleBottom;

          if (delta > 0) {
            scrollViewRef.current?.scrollTo({
              animated: true,
              y: Math.max(0, scrollOffsetRef.current + delta),
            });
          }
        });
      });
    },
    [windowHeight],
  );

  const focusField = useCallback(
    (field: string) => {
      activeFieldRef.current = field;
      ensureFieldVisible(field);
    },
    [ensureFieldVisible],
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (keyboardEvent) => {
      keyboardHeightRef.current = keyboardEvent.endCoordinates.height;
      keyboardTopRef.current = keyboardEvent.endCoordinates.screenY || windowHeight - keyboardEvent.endCoordinates.height;
      setKeyboardHeight(keyboardEvent.endCoordinates.height);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const field = activeFieldRef.current;

          if (field) {
            ensureFieldVisible(field);
          }
        });
      });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      keyboardTopRef.current = windowHeight;
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [ensureFieldVisible]);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      if (!eventId) {
        Alert.alert("Unable to load reward", "Missing event id.");
        router.back();
        return;
      }

      setIsLoading(true);

      try {
        const [loadedEvent, loadedProducts] = await Promise.all([
          getEventById(eventId),
          isProductReward ? getMyProducts() : Promise.resolve([]),
        ]);

        if (!isActive) {
          return;
        }

        setEvent(loadedEvent);
        setProducts(loadedProducts);
      } catch (error) {
        if (!isActive) {
          return;
        }

        Alert.alert("Unable to load reward", getAuthErrorMessage(error, "Please try again."));
        router.back();
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isActive = false;
    };
  }, [eventId, isProductReward, router]);

  useEffect(() => {
    if (isLoading || !event) {
      return;
    }

    if (reward) {
      setSelectedTargetId(isProductReward ? reward.productId ?? null : reward.ticketId ?? null);
      setOfferName(reward.name);
      setDescription(reward.description ?? "");
      setExpiresAt(getInitialRewardDate(reward, event));
      setDiscountPercent(String(reward.discountPercent));
      setBuyQuantity(String(reward.buyQuantity));
      setFreeQuantity(String(reward.freeQuantity));
      setCapacity(String(reward.capacity));
      return;
    }

    setSelectedTargetId((current) => current ?? selectorItems[0]?.id ?? null);
    setOfferName(isProductReward ? "Buy 1 product get 1 free" : "Buy 1 ticket get 1 free");
    setDescription("");
    setExpiresAt(getInitialRewardDate(null, event));
  }, [event, isLoading, isProductReward, reward, selectorItems]);

  const parseWholeNumber = (value: string, fallback: number, minimum: number) => {
    const parsed = Number.parseInt(value, 10);

    return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
  };

  const parseDiscount = (value: string) => {
    const parsed = Number.parseFloat(value);

    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.min(100, Math.max(0, parsed));
  };

  const handleConfirm = async () => {
    if (!eventId || isSaving) {
      return;
    }

    if (!selectedTargetId) {
      Alert.alert(
        isProductReward ? "Select product" : "Select ticket",
        isProductReward ? "Choose a product for this reward." : "Choose a ticket for this reward.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload: EventRewardPayload = {
        rewardType,
        ticketId: isProductReward ? null : selectedTargetId,
        productId: isProductReward ? selectedTargetId : null,
        name: offerName.trim() || (isProductReward ? "Product reward" : "Ticket reward"),
        description: description.trim() || null,
        expiresAt: expiresAt.toISOString(),
        discountPercent: parseDiscount(discountPercent),
        buyQuantity: parseWholeNumber(buyQuantity, 1, 1),
        freeQuantity: parseWholeNumber(freeQuantity, 1, 1),
        capacity: parseWholeNumber(capacity, 0, 0),
      };

      if (rewardId) {
        await updateEventReward(eventId, rewardId, payload);
      } else {
        await createEventReward(eventId, payload);
      }

      router.back();
    } catch (error) {
      Alert.alert("Unable to save reward", getAuthErrorMessage(error, "Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const onDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate) {
      const nextDate = new Date(expiresAt);
      nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      nextDate.setSeconds(0, 0);
      setExpiresAt(nextDate);
    }
  };

  const onTimeChange = (_event: unknown, selectedTime?: Date) => {
    setShowTimePicker(false);

    if (selectedTime) {
      const nextDate = new Date(expiresAt);
      nextDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setExpiresAt(nextDate);
    }
  };

  const renderInput = (
    id: string,
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: "default" | "number-pad" | "decimal-pad" = "default",
  ) => (
    <View ref={(node) => { fieldRefs.current[id] = node; }} style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        onFocus={() => focusField(id)}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <BackButton iconName={Cancel01Icon} size={24} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isProductReward ? "Set Product Offer" : "Set Ticket Offer"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.body}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(24, footerHeight + (keyboardHeight > 0 ? 24 : 0)) },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {isProductReward ? "PRODUCT" : "TICKET TYPE"}
            </Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.card }]}
              activeOpacity={0.85}
              onPress={() => setSelectorVisible(true)}
            >
              <Text
                style={[styles.selectorText, { color: selectedTarget ? colors.text : colors.textSecondary }]}
                numberOfLines={1}
              >
                {selectedTarget?.title ?? (isProductReward ? "Select Product" : "Select Ticket")}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {renderInput("offerName", "OFFER NAME", offerName, setOfferName, "Name")}
          {renderInput("description", "DESCRIPTION", description, setDescription, "Detail about ticket")}

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.rowItemLeft]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>END DATE</Text>
              <TouchableOpacity
                style={[styles.dateSelector, { backgroundColor: colors.card }]}
                activeOpacity={0.85}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={17} color={colors.textSecondary} />
                <Text style={[styles.dateSelectorText, { color: colors.text }]} numberOfLines={1}>
                  {formatDate(expiresAt)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, styles.rowItemRight]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>END TIME</Text>
              <TouchableOpacity
                style={[styles.dateSelector, { backgroundColor: colors.card }]}
                activeOpacity={0.85}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={17} color={colors.textSecondary} />
                <Text style={[styles.dateSelectorText, { color: colors.text }]} numberOfLines={1}>
                  {formatTime(expiresAt)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={expiresAt}
              mode="date"
              minimumDate={startOfToday(new Date())}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={expiresAt}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              is24Hour={false}
              onChange={onTimeChange}
            />
          )}

          {renderInput("discount", "DISCOUNT", discountPercent, setDiscountPercent, "4", "decimal-pad")}
          {isProductReward && renderInput("buyQuantity", "HOW MANY TO BUY", buyQuantity, setBuyQuantity, "1", "number-pad")}
          {renderInput(
            "freeQuantity",
            isProductReward ? "HOW MANY FREE" : "BUY 1 HOW MANY FREE",
            freeQuantity,
            setFreeQuantity,
            "1",
            "number-pad",
          )}
          {renderInput("capacity", "CAPACITY", capacity, setCapacity, "185", "number-pad")}
        </ScrollView>

        <View
          onLayout={(event) => {
            const nextFooterHeight = event.nativeEvent.layout.height;

            footerHeightRef.current = nextFooterHeight;
            setFooterHeight(nextFooterHeight);
          }}
          style={[styles.footer, { backgroundColor: colors.background }]}
        >
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.card }]}
            disabled={isSaving}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelButtonText, { color: isSaving ? colors.textSecondary : colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            disabled={isSaving}
            onPress={handleConfirm}
          >
            {isSaving ? (
              <View style={styles.buttonContent}>
                <Spinner color={colors.background} size="small" />
                <Text style={[styles.confirmButtonText, { color: colors.background }]}>Saving...</Text>
              </View>
            ) : (
              <Text style={[styles.confirmButtonText, { color: colors.background }]}>Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={selectorVisible} transparent animationType="fade" onRequestClose={() => setSelectorVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectorVisible(false)}>
          <View style={[styles.selectorSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.selectorTitle, { color: colors.text }]}>
              {isProductReward ? "Select Product" : "Select Ticket"}
            </Text>
            <ScrollView style={styles.selectorList} showsVerticalScrollIndicator={false}>
              {selectorItems.length > 0 ? (
                selectorItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.selectorOption, { borderBottomColor: colors.border }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedTargetId(item.id);
                      setSelectorVisible(false);
                    }}
                  >
                    {item.imageUri ? (
                      <Image source={{ uri: item.imageUri }} style={styles.selectorImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.selectorIcon, { backgroundColor: colors.background }]}>
                        <Ionicons
                          name={isProductReward ? "cube-outline" : "ticket-outline"}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </View>
                    )}
                    <View style={styles.selectorOptionText}>
                      <Text style={[styles.selectorOptionTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!!item.subtitle && (
                        <Text style={[styles.selectorOptionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                    {selectedTargetId === item.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.emptySelectorText, { color: colors.textSecondary }]}>
                  {isProductReward ? "No products available." : "No tickets available."}
                </Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  buttonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  cancelButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 18,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 18,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    paddingTop: 10,
  },
  dateSelector: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 14,
  },
  emptySelectorText: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 18,
  },
  footer: {
    flexDirection: "row",
    gap: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderRadius: 12,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  modalOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  row: {
    flexDirection: "row",
  },
  rowItemLeft: {
    flex: 1,
    marginRight: 8,
  },
  rowItemRight: {
    flex: 1,
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  selector: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  selectorIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  selectorImage: {
    borderRadius: 10,
    height: 40,
    width: 40,
  },
  selectorList: {
    maxHeight: 360,
  },
  selectorOption: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
  },
  selectorOptionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  selectorOptionText: {
    flex: 1,
  },
  selectorOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  selectorSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    marginRight: 12,
  },
  selectorTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
});
