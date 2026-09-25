import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  EVENT_WINDOW_CONTENT_TYPES,
  EVENT_WINDOW_PARTICIPANT_POST_VISIBILITIES,
  EVENT_WINDOW_POSTING_ELIGIBILITIES,
  cancelEventWindow,
  createEventWindow,
  getEventWindows,
  updateEventWindow,
  type EventWindow,
  type EventWindowContentType,
  type EventWindowParticipantPostVisibility,
  type EventWindowPostingEligibility,
} from "@/lib/eventWindows";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HostEventWindowsTabProps = {
  eventId: string;
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  canManageWindows?: boolean;
};

export type EventWindowsTabRefreshHandle = {
  refresh: () => Promise<void>;
};

type PickerTarget = "startDate" | "startTime" | "endDate" | "endTime" | null;

type WindowFormState = {
  title: string;
  details: string;
  startsAt: Date;
  endsAt: Date;
  allowedContentTypes: EventWindowContentType[];
  maxPosts: string;
  postingEligibility: EventWindowPostingEligibility;
  participantPostVisibility: EventWindowParticipantPostVisibility;
};

const POSTING_ELIGIBILITY_LABELS: Record<EventWindowPostingEligibility, { title: string; description: string }> = {
  ticket_holders: {
    title: "Ticket holders",
    description: "Anyone with a valid event ticket can post. Check-in is not required.",
  },
  checked_in_attendees: {
    title: "Checked-in attendees",
    description: "Only attendees who have successfully checked in can post.",
  },
};

const PARTICIPANT_VISIBILITY_LABELS: Record<EventWindowParticipantPostVisibility, { title: string; description: string }> = {
  instant: {
    title: "Instant",
    description: "After posting, participants can immediately view posts in this scene.",
  },
  end_of_event: {
    title: "End of event",
    description: "Participants can view posts after the event ends.",
  },
};

const CONTENT_TYPE_LABELS: Record<EventWindowContentType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  audio: "Audio",
};

const CONTENT_TYPE_ICONS: Record<EventWindowContentType, React.ComponentProps<typeof Feather>["name"]> = {
  text: "type",
  image: "image",
  video: "video",
  audio: "mic",
};

// Event-window video posting is temporarily disabled (resource-constrained
// deploy) — hosts can no longer opt new/updated windows into "video".
// Existing windows that already allow video keep that configuration (no data
// mutation here); attendees are blocked from actually posting video by the
// matching guard in AttendeeEventWindowsTab.
const EVENT_WINDOW_VIDEO_ENABLED = false;
const SELECTABLE_EVENT_WINDOW_CONTENT_TYPES = EVENT_WINDOW_VIDEO_ENABLED
  ? EVENT_WINDOW_CONTENT_TYPES
  : EVENT_WINDOW_CONTENT_TYPES.filter((type) => type !== "video");

const STATUS_COLORS = {
  scheduled: "#3B82F6",
  open: "#16A34A",
  closed: "#71717A",
  cancelled: "#DC2626",
} as const;

const parseDate = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

// Only the event's end time is a hard ceiling now — a window may legitimately
// start before the event does, so there is no lower bound to clamp against.
const clampToEventEnd = (value: Date, maximum: Date) => new Date(Math.min(maximum.getTime(), value.getTime()));

const createInitialForm = (
  eventEndsAt?: string | null,
  window?: EventWindow | null,
): WindowFormState => {
  if (window) {
    return {
      title: window.title ?? "",
      details: window.details ?? "",
      startsAt: parseDate(window.startsAt),
      endsAt: parseDate(window.endsAt),
      allowedContentTypes: [...window.allowedContentTypes],
      maxPosts: String(window.maxPosts),
      postingEligibility: window.postingEligibility,
      participantPostVisibility: window.participantPostVisibility,
    };
  }

  const eventEnd = parseDate(eventEndsAt);
  const start = clampToEventEnd(new Date(), eventEnd);
  const end = clampToEventEnd(new Date(start.getTime() + 30 * 60 * 1000), eventEnd);

  return {
    title: "",
    details: "",
    startsAt: start,
    endsAt: end,
    allowedContentTypes: ["image"],
    maxPosts: "25",
    // Backward-compatible defaults — a host who doesn't touch these controls
    // gets the same behavior every window had before this feature existed.
    postingEligibility: "checked_in_attendees",
    participantPostVisibility: "end_of_event",
  };
};

const formatDate = (date: Date) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(date);

const formatTime = (date: Date) => new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
}).format(date);

const formatWindowRange = (startsAt: string, endsAt: string) => {
  const start = parseDate(startsAt);
  const end = parseDate(endsAt);
  const sameDay = start.toDateString() === end.toDateString();

  return sameDay
    ? `${formatDate(start)} · ${formatTime(start)} - ${formatTime(end)}`
    : `${formatDate(start)}, ${formatTime(start)} - ${formatDate(end)}, ${formatTime(end)}`;
};

const replaceDatePart = (current: Date, selected: Date) => {
  const next = new Date(current);
  next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return next;
};

const replaceTimePart = (current: Date, selected: Date) => {
  const next = new Date(current);
  next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next;
};

const HostEventWindowsTab = React.forwardRef<EventWindowsTabRefreshHandle, HostEventWindowsTabProps>(({
  eventId,
  eventStartsAt,
  eventEndsAt,
  canManageWindows = false,
}, ref) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const formScrollRef = useRef<ScrollView>(null);
  const windowHeightRef = useRef(windowHeight);
  const [windows, setWindows] = useState<EventWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingWindow, setEditingWindow] = useState<EventWindow | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [form, setForm] = useState(() => createInitialForm(eventEndsAt));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingWindowId, setCancellingWindowId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const androidNavigationInset = Platform.OS === "android"
    ? Math.max(0, Dimensions.get("screen").height - windowHeight)
    : 0;
  const modalBottomPadding = Math.max(insets.bottom, androidNavigationInset, Platform.OS === "android" ? 16 : 12);
  const formBodyBottomPadding = Platform.OS === "android" ? keyboardBottomInset : 0;
  const ModalContainer = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  const modalContainerProps = Platform.OS === "ios" ? { behavior: "padding" as const } : {};

  const eventEnd = useMemo(() => parseDate(eventEndsAt), [eventEndsAt]);
  const isOpenEdit = editingWindow?.computedStatus === "open";

  const loadWindows = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setLoadError(null);
    try {
      setWindows(await getEventWindows(eventId));
    } catch (error) {
      setLoadError(getAuthErrorMessage(error, "Unable to load event scenes."));
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [eventId]);

  React.useImperativeHandle(ref, () => ({
    refresh: () => loadWindows(false),
  }), [loadWindows]);

  useEffect(() => {
    void loadWindows();
  }, [loadWindows]);

  useEffect(() => {
    windowHeightRef.current = windowHeight;
  }, [windowHeight]);

  const updateKeyboardBottomInset = useCallback((event: { endCoordinates?: { height?: number; screenY?: number } }) => {
    const coordinates = event.endCoordinates;
    const coveredByScreenY = typeof coordinates?.screenY === "number"
      ? Math.max(0, windowHeightRef.current - coordinates.screenY)
      : Math.max(0, coordinates?.height ?? 0);
    const coveredByHeight = Math.max(0, coordinates?.height ?? 0);

    setKeyboardBottomInset(Math.max(coveredByScreenY, coveredByHeight));
  }, []);

  useEffect(() => {
    if (!isFormVisible || Platform.OS !== "android") {
      setKeyboardBottomInset(0);
      return;
    }

    const showSubscription = Keyboard.addListener("keyboardDidShow", updateKeyboardBottomInset);
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setKeyboardBottomInset(0));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      setKeyboardBottomInset(0);
    };
  }, [isFormVisible, updateKeyboardBottomInset]);

  const openCreateForm = () => {
    if (!canManageWindows) return;
    setEditingWindow(null);
    setForm(createInitialForm(eventEndsAt));
    setFormError(null);
    setPickerTarget(null);
    setIsFormVisible(true);
  };

  const openEditForm = (window: EventWindow) => {
    if (!canManageWindows) return;
    setEditingWindow(window);
    setForm(createInitialForm(eventEndsAt, window));
    setFormError(null);
    setPickerTarget(null);
    setIsFormVisible(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    Keyboard.dismiss();
    setPickerTarget(null);
    setKeyboardBottomInset(0);
    setIsFormVisible(false);
  };

  const openPicker = (target: Exclude<PickerTarget, null>) => {
    Keyboard.dismiss();
    setPickerTarget(target);
  };

  const scrollFormToEnd = () => {
    requestAnimationFrame(() => formScrollRef.current?.scrollToEnd({ animated: true }));
  };

  const toggleContentType = (contentType: EventWindowContentType) => {
    if (isOpenEdit) return;
    setForm((current) => ({
      ...current,
      allowedContentTypes: current.allowedContentTypes.includes(contentType)
        ? current.allowedContentTypes.filter((item) => item !== contentType)
        : [...current.allowedContentTypes, contentType],
    }));
  };

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    const target = pickerTarget;
    if (Platform.OS !== "ios" || event.type === "dismissed") setPickerTarget(null);
    if (event.type === "dismissed" || !selected || !target) return;

    setForm((current) => {
      if (target === "startDate") return { ...current, startsAt: replaceDatePart(current.startsAt, selected) };
      if (target === "startTime") return { ...current, startsAt: replaceTimePart(current.startsAt, selected) };
      if (target === "endDate") return { ...current, endsAt: replaceDatePart(current.endsAt, selected) };
      return { ...current, endsAt: replaceTimePart(current.endsAt, selected) };
    });
  };

  const validateForm = () => {
    const maxPosts = Number(form.maxPosts);
    if (form.allowedContentTypes.length === 0) return "Select at least one allowed content type.";
    if (!Number.isInteger(maxPosts) || maxPosts < 1 || maxPosts > 10000) return "Maximum posts must be between 1 and 10,000.";
    if (form.startsAt >= form.endsAt) return "Scene end time must be after its start time.";
    // The window may start before the event does, but it can never outlast
    // it — endsAt is a hard ceiling at the event's own end time.
    if (form.endsAt > eventEnd) return "Scene cannot end after the event ends.";
    if (editingWindow && maxPosts < editingWindow.acceptedPostCount) {
      return `Maximum posts cannot be lower than ${editingWindow.acceptedPostCount} accepted posts.`;
    }
    return null;
  };

  const saveWindow = async () => {
    if (!canManageWindows) return;
    Keyboard.dismiss();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      scrollFormToEnd();
      return;
    }

    const editableFields = {
      title: form.title.trim() || null,
      details: form.details.trim() || null,
      startsAt: form.startsAt.toISOString(),
      endsAt: form.endsAt.toISOString(),
      allowedContentTypes: form.allowedContentTypes,
      maxPosts: Number(form.maxPosts),
    };

    setIsSaving(true);
    setFormError(null);
    try {
      // postingEligibility/participantPostVisibility are create-time-only —
      // the backend rejects them on a PATCH, so they're never included here.
      const saved = editingWindow
        ? await updateEventWindow(eventId, editingWindow.id, isOpenEdit
          ? { title: editableFields.title, details: editableFields.details, endsAt: editableFields.endsAt, maxPosts: editableFields.maxPosts }
          : editableFields)
        : await createEventWindow(eventId, {
          ...editableFields,
          postingEligibility: form.postingEligibility,
          participantPostVisibility: form.participantPostVisibility,
        });
      setWindows((current) => {
        const next = editingWindow
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [...current, saved];
        return next.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
      });
      setIsFormVisible(false);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, "Unable to save this scene."));
      scrollFormToEnd();
    } finally {
      setIsSaving(false);
    }
  };

  const confirmCancel = (window: EventWindow) => {
    if (!canManageWindows) return;
    Alert.alert(
      "Cancel scene?",
      "This scene will stop accepting posts. This action cannot be undone.",
      [
        { text: "Keep Scene", style: "cancel" },
        {
          text: "Cancel Scene",
          style: "destructive",
          onPress: async () => {
            setCancellingWindowId(window.id);
            try {
              const cancelled = await cancelEventWindow(eventId, window.id);
              setWindows((current) => current.map((item) => item.id === cancelled.id ? cancelled : item));
            } catch (error) {
              Alert.alert("Unable to cancel scene", getAuthErrorMessage(error));
            } finally {
              setCancellingWindowId(null);
            }
          },
        },
      ],
    );
  };

  const renderWindow = (window: EventWindow) => {
    const canManage = canManageWindows && (window.computedStatus === "scheduled" || window.computedStatus === "open");
    const statusColor = STATUS_COLORS[window.computedStatus];

    return (
      <View key={window.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {window.title?.trim() || "Untitled scene"}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {window.computedStatus[0].toUpperCase() + window.computedStatus.slice(1)}
              </Text>
            </View>
          </View>
          {canManage ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => openEditForm(window)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${window.title || "scene"}`}
            >
              <Feather name="edit-2" size={18} color={colors.text} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.timeRow}>
          <Feather name="clock" size={16} color={colors.textSecondary} />
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatWindowRange(window.startsAt, window.endsAt)}</Text>
        </View>

        <View style={styles.contentTypesRow}>
          {window.allowedContentTypes.map((type) => (
            <View key={type} style={[styles.contentTypeBadge, { borderColor: colors.border }]}>
              <Feather name={CONTENT_TYPE_ICONS[type]} size={14} color={colors.textSecondary} />
              <Text style={[styles.contentTypeText, { color: colors.textSecondary }]}>{CONTENT_TYPE_LABELS[type]}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.text }]}>{window.maxPosts}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Maximum</Text></View>
          <View style={[styles.statItem, styles.statDivider, { borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.text }]}>{window.acceptedPostCount}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accepted</Text></View>
          <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.text }]}>{window.remainingSlots}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining</Text></View>
        </View>

        {canManage ? (
          <TouchableOpacity
            style={styles.cancelAction}
            onPress={() => confirmCancel(window)}
            disabled={cancellingWindowId === window.id}
          >
            {cancellingWindowId === window.id
              ? <ActivityIndicator size="small" color={colors.danger} />
              : <Feather name="x-circle" size={16} color={colors.danger} />}
            <Text style={[styles.cancelActionText, { color: colors.danger }]}>Cancel scene</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const pickerValue = pickerTarget?.startsWith("start") ? form.startsAt : form.endsAt;
  const pickerMode = pickerTarget?.endsWith("Date") ? "date" : "time";

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={[styles.heading, { color: colors.text }]}>Posting scenes</Text>
        </View>
        {canManageWindows ? (
          <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.text }]} onPress={openCreateForm}>
            <Feather name="plus" size={18} color={colors.background} />
            <Text style={[styles.createButtonText, { color: colors.background }]}>Create</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : loadError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={28} color={colors.danger} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Scenes unavailable</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{loadError}</Text>
          <TouchableOpacity style={[styles.retryButton, { borderColor: colors.border }]} onPress={() => void loadWindows()}>
            <Feather name="refresh-cw" size={16} color={colors.text} />
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : windows.length === 0 ? (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Feather name="clock" size={30} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No posting scenes have been created for this event.</Text>
        </View>
      ) : windows.map(renderWindow)}

      <Modal
        visible={isFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
        onRequestClose={closeForm}
      >
        <ModalContainer
          style={[styles.modal, { backgroundColor: colors.background }]}
          {...modalContainerProps}
        >
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: colors.border,
                paddingTop: Math.max(insets.top, 8),
              },
            ]}
          >
            <TouchableOpacity style={styles.iconButton} onPress={closeForm} disabled={isSaving} accessibilityLabel="Close scene form">
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingWindow ? "Edit scene" : "Create scene"}</Text>
            <View style={styles.iconButton} />
          </View>

          <View style={[styles.formBody, { paddingBottom: formBodyBottomPadding }]}>
            <ScrollView
              ref={formScrollRef}
              style={styles.formScroll}
              contentContainerStyle={[
                styles.formContent,
                { paddingBottom: modalBottomPadding + 32 },
              ]}
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              {isOpenEdit ? (
                <View style={[styles.notice, { backgroundColor: isDark ? "#172033" : "#EFF6FF" }]}>
                  <Feather name="info" size={17} color="#3B82F6" />
                  <Text style={[styles.noticeText, { color: colors.text }]}>This scene is open. Its start time and content types can no longer be changed.</Text>
                </View>
              ) : null}

              <Text style={[styles.label, { color: colors.textSecondary }]}>TITLE (OPTIONAL)</Text>
              <TextInput
                value={form.title}
                onChangeText={(title) => setForm((current) => ({ ...current, title }))}
                placeholder="e.g. Opening night photos"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                maxLength={120}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>DETAILS (OPTIONAL)</Text>
              <TextInput
                value={form.details}
                onChangeText={(details) => setForm((current) => ({ ...current, details }))}
                placeholder="Add scene details"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.detailsInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                maxLength={500}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>START</Text>
              <View style={styles.selectorRow}>
                <TouchableOpacity disabled={isOpenEdit} style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border, opacity: isOpenEdit ? 0.55 : 1 }]} onPress={() => openPicker("startDate")}>
                  <Feather name="calendar" size={17} color={colors.textSecondary} /><Text style={[styles.selectorText, { color: colors.text }]}>{formatDate(form.startsAt)}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={isOpenEdit} style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border, opacity: isOpenEdit ? 0.55 : 1 }]} onPress={() => openPicker("startTime")}>
                  <Feather name="clock" size={17} color={colors.textSecondary} /><Text style={[styles.selectorText, { color: colors.text }]}>{formatTime(form.startsAt)}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>END</Text>
              <View style={styles.selectorRow}>
                <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openPicker("endDate")}>
                  <Feather name="calendar" size={17} color={colors.textSecondary} /><Text style={[styles.selectorText, { color: colors.text }]}>{formatDate(form.endsAt)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openPicker("endTime")}>
                  <Feather name="clock" size={17} color={colors.textSecondary} /><Text style={[styles.selectorText, { color: colors.text }]}>{formatTime(form.endsAt)}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>ALLOWED CONTENT</Text>
              <View style={styles.contentSelector}>
                {SELECTABLE_EVENT_WINDOW_CONTENT_TYPES.map((type) => {
                  const selected = form.allowedContentTypes.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      disabled={isOpenEdit}
                      style={[styles.contentOption, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}22` : colors.card, opacity: isOpenEdit ? 0.6 : 1 }]}
                      onPress={() => toggleContentType(type)}
                    >
                      <Feather name={CONTENT_TYPE_ICONS[type]} size={18} color={selected ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.contentOptionText, { color: selected ? colors.text : colors.textSecondary }]}>{CONTENT_TYPE_LABELS[type]}</Text>
                      <Feather name={selected ? "check-circle" : "circle"} size={17} color={selected ? colors.primary : colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>MAXIMUM POSTS</Text>
              <TextInput
                value={form.maxPosts}
                onChangeText={(maxPosts) => setForm((current) => ({ ...current, maxPosts: maxPosts.replace(/[^0-9]/g, "") }))}
                keyboardType="number-pad"
                placeholder="25"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                maxLength={5}
                onFocus={scrollFormToEnd}
              />
              {editingWindow ? <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>Currently accepted: {editingWindow.acceptedPostCount}</Text> : null}

              <Text style={[styles.label, { color: colors.textSecondary }]}>WHO CAN POST?</Text>
              {editingWindow ? (
                <View style={[styles.policyReadout, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.policyReadoutTitle, { color: colors.text }]}>{POSTING_ELIGIBILITY_LABELS[form.postingEligibility].title}</Text>
                  <Text style={[styles.policyReadoutBody, { color: colors.textSecondary }]}>{POSTING_ELIGIBILITY_LABELS[form.postingEligibility].description}</Text>
                </View>
              ) : (
                <View style={styles.policyOptions}>
                  {EVENT_WINDOW_POSTING_ELIGIBILITIES.map((option) => {
                    const selected = form.postingEligibility === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.policyOption, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : colors.card }]}
                        onPress={() => setForm((current) => ({ ...current, postingEligibility: option }))}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Feather name={selected ? "check-circle" : "circle"} size={18} color={selected ? colors.primary : colors.textSecondary} />
                        <View style={styles.policyOptionText}>
                          <Text style={[styles.policyOptionTitle, { color: colors.text }]}>{POSTING_ELIGIBILITY_LABELS[option].title}</Text>
                          <Text style={[styles.policyOptionBody, { color: colors.textSecondary }]}>{POSTING_ELIGIBILITY_LABELS[option].description}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>WHEN CAN PARTICIPANTS VIEW POSTS?</Text>
              {editingWindow ? (
                <View style={[styles.policyReadout, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.policyReadoutTitle, { color: colors.text }]}>{PARTICIPANT_VISIBILITY_LABELS[form.participantPostVisibility].title}</Text>
                  <Text style={[styles.policyReadoutBody, { color: colors.textSecondary }]}>{PARTICIPANT_VISIBILITY_LABELS[form.participantPostVisibility].description}</Text>
                </View>
              ) : (
                <View style={styles.policyOptions}>
                  {EVENT_WINDOW_PARTICIPANT_POST_VISIBILITIES.map((option) => {
                    const selected = form.participantPostVisibility === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.policyOption, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : colors.card }]}
                        onPress={() => setForm((current) => ({ ...current, participantPostVisibility: option }))}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Feather name={selected ? "check-circle" : "circle"} size={18} color={selected ? colors.primary : colors.textSecondary} />
                        <View style={styles.policyOptionText}>
                          <Text style={[styles.policyOptionTitle, { color: colors.text }]}>{PARTICIPANT_VISIBILITY_LABELS[option].title}</Text>
                          <Text style={[styles.policyOptionBody, { color: colors.textSecondary }]}>{PARTICIPANT_VISIBILITY_LABELS[option].description}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {editingWindow ? (
                <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>Set when the scene was created — cannot be changed afterward.</Text>
              ) : null}

              {formError ? (
                <View style={[styles.errorBox, { borderColor: colors.danger }]}>
                  <Feather name="alert-circle" size={17} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
                </View>
              ) : null}
            </ScrollView>

            {pickerTarget ? (
              <View
                style={[
                  styles.pickerContainer,
                  {
                    borderTopColor: colors.border,
                    backgroundColor: colors.background,
                    paddingBottom: modalBottomPadding,
                  },
                ]}
              >
                {Platform.OS === "ios" ? <TouchableOpacity style={styles.pickerDone} onPress={() => setPickerTarget(null)}><Text style={[styles.saveText, { color: colors.primary }]}>Done</Text></TouchableOpacity> : null}
                <DateTimePicker
                  value={pickerValue}
                  mode={pickerMode}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  // No lower bound — a window may now start before the event
                  // does. The event's end time is still a hard ceiling for
                  // both start and end (a window can never outlast the event).
                  maximumDate={pickerMode === "date" ? eventEnd : undefined}
                  onChange={handlePickerChange}
                />
              </View>
            ) : null}

            <View
              style={[
                styles.formActions,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.background,
                  paddingBottom: modalBottomPadding,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.formActionButton, { borderColor: colors.border }]}
                onPress={closeForm}
                disabled={isSaving}
              >
                <Text style={[styles.formCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formActionButton, { backgroundColor: colors.text }]}
                onPress={() => void saveWindow()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[styles.formSaveText, { color: colors.background }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ModalContainer>
      </Modal>
    </View>
  );
});

HostEventWindowsTab.displayName = "HostEventWindowsTab";

export default HostEventWindowsTab;

const styles = StyleSheet.create({
  container: { paddingTop: 20 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 },
  headingText: { flex: 1 },
  heading: { fontSize: 20, fontWeight: "700" },
  createButton: { height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, borderRadius: 8 },
  createButtonText: { fontSize: 14, fontWeight: "700" },
  loading: { marginVertical: 48 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cardTitleGroup: { flex: 1, alignItems: "flex-start", gap: 8 },
  cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
  statusBadge: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, borderRadius: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  timeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14 },
  timeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  contentTypesRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  contentTypeBadge: { minHeight: 29, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6 },
  contentTypeText: { fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 15 },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth },
  statValue: { fontSize: 17, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 3 },
  cancelAction: { minHeight: 38, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 10 },
  cancelActionText: { fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 38, paddingHorizontal: 24, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 290 },
  retryButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 6 },
  retryText: { fontSize: 14, fontWeight: "600" },
  modal: { flex: 1 },
  modalHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  saveText: { fontSize: 15, fontWeight: "700", paddingHorizontal: 10 },
  formBody: { flex: 1 },
  formScroll: { flex: 1 },
  formContent: { padding: 20, paddingBottom: 48 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 8, marginBottom: 20 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 11, fontWeight: "700", marginBottom: 8, marginTop: 18 },
  input: { minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 14, fontSize: 15 },
  detailsInput: { minHeight: 92, paddingTop: 12, paddingBottom: 12, lineHeight: 20 },
  selectorRow: { flexDirection: "row", gap: 10 },
  selector: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  selectorText: { flexShrink: 1, fontSize: 13, fontWeight: "600" },
  contentSelector: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  contentOption: { width: "48%", minHeight: 46, flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  contentOptionText: { flex: 1, fontSize: 13, fontWeight: "600" },
  fieldHint: { fontSize: 12, marginTop: 7 },
  policyOptions: { gap: 9 },
  policyOption: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderWidth: 1, borderRadius: 8 },
  policyOptionText: { flex: 1, gap: 2 },
  policyOptionTitle: { fontSize: 14, fontWeight: "700" },
  policyOptionBody: { fontSize: 12.5, lineHeight: 17 },
  policyReadout: { padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, gap: 2 },
  policyReadoutTitle: { fontSize: 14, fontWeight: "700" },
  policyReadoutBody: { fontSize: 12.5, lineHeight: 17 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 20 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  pickerContainer: { borderTopWidth: StyleSheet.hairlineWidth },
  pickerDone: { alignSelf: "flex-end", paddingVertical: 8, paddingRight: 10 },
  formActions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  formActionButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  formCancelText: { fontSize: 15, fontWeight: "700" },
  formSaveText: { fontSize: 15, fontWeight: "700" },
});
