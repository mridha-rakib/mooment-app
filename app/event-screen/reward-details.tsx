import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage, isBusinessAccountRequiredError, isTicketRewardConflictError } from "@/lib/authErrors";
import { useAuthStore } from "@/stores/authStore";
import {
  createEventReward,
  getEventById,
  ticketAlreadyHasReward,
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

const clampDate = (value: Date, max?: Date | null) => {
  if (!max || Number.isNaN(max.getTime())) {
    return value;
  }

  return value > max ? new Date(max) : value;
};

const getSalesEndDate = (event?: EventResponse | null, ticketId?: string | null): Date | null => {
  if (!event) {
    return null;
  }

  if (ticketId) {
    const ticket = event.tickets.find((t) => t.id === ticketId);
    if (ticket?.salesEndAt) {
      const parsed = new Date(ticket.salesEndAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // Fallback: use the latest salesEndAt across all tickets, or event scheduledAt
  const allSalesEnds = event.tickets
    .map((t) => (t.salesEndAt ? new Date(t.salesEndAt).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));

  if (allSalesEnds.length > 0) {
    return new Date(Math.max(...allSalesEnds));
  }

  if (event.scheduledAt) {
    const parsed = new Date(event.scheduledAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const getInitialRewardDate = (reward?: EventRewardPayload | null, event?: EventResponse | null, maxDate?: Date | null) => {
  const source = reward?.expiresAt ?? event?.scheduledAt ?? null;
  const parsed = source ? new Date(source) : null;

  if (parsed && !Number.isNaN(parsed.getTime())) {
    return clampDate(parsed, maxDate);
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  fallback.setSeconds(0, 0);

  return clampDate(fallback, maxDate);
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

  const safeBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home");
    }
  };
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
  const [discountPercent, setDiscountPercent] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [freeQuantity, setFreeQuantity] = useState("");
  const [capacity, setCapacity] = useState("");
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

  const authUser = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const reward = useMemo(
    () => event?.rewards.find((item) => item.id === rewardId) ?? null,
    [event?.rewards, rewardId],
  );

  const salesEndDate = useMemo(
    () => (isProductReward ? null : getSalesEndDate(event, selectedTargetId)),
    [event, isProductReward, selectedTargetId],
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

    return (event?.tickets ?? [])
      .filter((ticket) => !ticketAlreadyHasReward(event?.rewards, ticket.id ?? ticket.name, rewardId))
      .map((ticket) => ({
        id: ticket.id ?? ticket.name,
        title: ticket.name,
        subtitle: ticket.description,
      }));
  }, [event?.rewards, event?.tickets, isProductReward, products, rewardId]);

  const selectedTarget = useMemo(
    () => selectorItems.find((item) => item.id === selectedTargetId) ?? null,
    [selectedTargetId, selectorItems],
  );

  const selectedTicket = useMemo(
    () => (!isProductReward && selectedTargetId
      ? (event?.tickets ?? []).find((t) => t.id === selectedTargetId) ?? null
      : null),
    [event?.tickets, isProductReward, selectedTargetId],
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
        safeBack();
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
        safeBack();
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

    const maxDate = isProductReward ? null : getSalesEndDate(event, reward?.ticketId ?? null);

    if (reward) {
      setSelectedTargetId(isProductReward ? reward.productId ?? null : reward.ticketId ?? null);
      setOfferName(reward.name);
      setDescription(reward.description ?? "");
      setExpiresAt(getInitialRewardDate(reward, event, maxDate));
      setDiscountPercent(String(reward.discountPercent));
      setBuyQuantity(String(reward.buyQuantity));
      setFreeQuantity(String(reward.freeQuantity));
      setCapacity(String(reward.capacity));
      return;
    }

    setSelectedTargetId((current) => current ?? selectorItems[0]?.id ?? null);
    setOfferName("");
    setDescription("");
    setExpiresAt(getInitialRewardDate(null, event, maxDate));
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

  const discountedPrice = useMemo(() => {
    if (!selectedTicket || selectedTicket.type === "free") return null;
    const pct = parseDiscount(discountPercent);
    if (pct <= 0) return null;
    return selectedTicket.price * (1 - pct / 100);
  }, [selectedTicket, discountPercent]);

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

    if (
      !isProductReward
      && event
      && ticketAlreadyHasReward(event.rewards, selectedTargetId, rewardId)
    ) {
      Alert.alert(
        "Reward already exists",
        "This ticket already has a reward. Each ticket can have only one reward. Edit or delete the existing reward before creating another.",
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

      safeBack();
    } catch (error) {
      if (isBusinessAccountRequiredError(error)) {
        if (completedProfileTypes.includes("business")) {
          Alert.alert(
            "Business Account Required",
            "Rewards can only be managed from a Business Account. Switch to your Business Account now?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Switch Account",
                onPress: async () => {
                  try {
                    await updateProfile({ accountType: "business" });
                  } catch {
                    Alert.alert("Switch Failed", "Unable to switch account. Please try again.");
                  }
                },
              },
            ],
          );
        } else {
          Alert.alert(
            "Business Account Required",
            "Rewards can only be managed from a Business Account. Set up your Business Account first.",
            [
              { text: "Not Now", style: "cancel" },
              {
                text: "Set Up Business Account",
                onPress: () => {
                  router.push({
                    pathname: "/profile-screen/edit-profile",
                    params: { type: "business", mode: "switch" },
                  });
                },
              },
            ],
          );
        }
      } else if (isTicketRewardConflictError(error)) {
        Alert.alert(
          "Reward already exists",
          getAuthErrorMessage(
            error,
            "This ticket already has a reward. Choose another ticket or edit the existing reward.",
          ),
        );
      } else {
        Alert.alert("Unable to save reward", getAuthErrorMessage(error, "Please try again."));
      }
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
      setExpiresAt(clampDate(nextDate, salesEndDate));
    }
  };

  const onTimeChange = (_event: unknown, selectedTime?: Date) => {
    setShowTimePicker(false);

    if (selectedTime) {
      const nextDate = new Date(expiresAt);
      nextDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setExpiresAt(clampDate(nextDate, salesEndDate));
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

          {selectedTicket && (
            <View style={[styles.ticketCard, { backgroundColor: colors.card }]}>
              <View style={styles.ticketCardRow}>
                <View style={[styles.ticketTypeBadge, { backgroundColor: selectedTicket.type === "free" ? colors.primary + "22" : colors.textSecondary + "22" }]}>
                  <Text style={[styles.ticketTypeBadgeText, { color: selectedTicket.type === "free" ? colors.primary : colors.textSecondary }]}>
                    {selectedTicket.type === "free" ? "Free" : "Paid"}
                  </Text>
                </View>
                {selectedTicket.type === "free" ? (
                  <Text style={[styles.ticketPrice, { color: colors.text }]}>Free</Text>
                ) : discountedPrice !== null ? (
                  <View style={styles.priceContainer}>
                    <Text style={[styles.ticketPriceStrike, { color: colors.textSecondary }]}>
                      ${selectedTicket.price.toFixed(2)}
                    </Text>
                    <Text style={[styles.ticketPriceDiscounted, { color: colors.primary }]}>
                      ${discountedPrice.toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.ticketPrice, { color: colors.text }]}>
                    ${selectedTicket.price.toFixed(2)}
                  </Text>
                )}
              </View>

              <View style={styles.ticketCardRow}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.ticketInfoText, { color: colors.textSecondary }]}>
                  {selectedTicket.capacity > 0 ? `${selectedTicket.capacity} capacity` : "Unlimited capacity"}
                </Text>
                {selectedTicket.salesEndAt && (
                  <>
                    <Text style={[styles.ticketInfoDot, { color: colors.textSecondary }]}>·</Text>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.ticketInfoText, { color: colors.textSecondary }]}>
                      {`Sales end ${formatDate(new Date(selectedTicket.salesEndAt))}`}
                    </Text>
                  </>
                )}
              </View>

              {!!selectedTicket.description && (
                <Text style={[styles.ticketDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {selectedTicket.description}
                </Text>
              )}
            </View>
          )}

          {renderInput("offerName", "OFFER NAME", offerName, setOfferName, "e.g. Buy 1 get 1 free")}
          {renderInput("description", "DESCRIPTION", description, setDescription, isProductReward ? "Detail about product" : "Detail about ticket")}

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
              maximumDate={salesEndDate ?? undefined}
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

          {renderInput("discount", "DISCOUNT (%)", discountPercent, setDiscountPercent, "e.g. 10", "decimal-pad")}
          {isProductReward && renderInput("buyQuantity", "HOW MANY TO BUY", buyQuantity, setBuyQuantity, "e.g. 2", "number-pad")}
          {renderInput(
            "freeQuantity",
            isProductReward ? "HOW MANY FREE" : "BUY 1 HOW MANY FREE",
            freeQuantity,
            setFreeQuantity,
            "e.g. 1",
            "number-pad",
          )}
          {renderInput("capacity", "CAPACITY (0 = unlimited)", capacity, setCapacity, "e.g. 100", "number-pad")}
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
            onPress={() => safeBack()}
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

                      // Clamp the expiry date to the new ticket's sales end date
                      if (!isProductReward) {
                        const nextSalesEnd = getSalesEndDate(event, item.id);
                        if (nextSalesEnd) {
                          setExpiresAt((current) => clampDate(current, nextSalesEnd));
                        }
                      }
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
  ticketCard: {
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ticketCardRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  ticketDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  ticketInfoDot: {
    fontSize: 13,
  },
  ticketInfoText: {
    fontSize: 13,
  },
  ticketPrice: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
  },
  ticketTypeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ticketTypeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  priceContainer: {
    alignItems: "flex-end",
    flex: 1,
    gap: 1,
  },
  ticketPriceStrike: {
    fontSize: 12,
    fontWeight: "500",
    textDecorationLine: "line-through",
  },
  ticketPriceDiscounted: {
    fontSize: 15,
    fontWeight: "700",
  },
});
