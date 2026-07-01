import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  EVENT_WINDOW_CONTENT_TYPES,
  cancelEventWindow,
  createEventWindow,
  getEventWindows,
  updateEventWindow,
  type EventWindow,
  type EventWindowContentType,
  type EventWindowPayload,
} from "@/lib/eventWindows";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HostEventWindowsTabProps = {
  eventId: string;
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
};

type PickerTarget = "startDate" | "startTime" | "endDate" | "endTime" | null;

type WindowFormState = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  allowedContentTypes: EventWindowContentType[];
  maxPosts: string;
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

const clampDate = (value: Date, minimum: Date, maximum: Date) =>
  new Date(Math.min(maximum.getTime(), Math.max(minimum.getTime(), value.getTime())));

const createInitialForm = (
  eventStartsAt?: string | null,
  eventEndsAt?: string | null,
  window?: EventWindow | null,
): WindowFormState => {
  if (window) {
    return {
      title: window.title ?? "",
      startsAt: parseDate(window.startsAt),
      endsAt: parseDate(window.endsAt),
      allowedContentTypes: [...window.allowedContentTypes],
      maxPosts: String(window.maxPosts),
    };
  }

  const eventStart = parseDate(eventStartsAt);
  const eventEnd = parseDate(eventEndsAt);
  const start = clampDate(new Date(), eventStart, eventEnd);
  const end = clampDate(new Date(start.getTime() + 30 * 60 * 1000), start, eventEnd);

  return {
    title: "",
    startsAt: start,
    endsAt: end,
    allowedContentTypes: ["image"],
    maxPosts: "25",
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

const HostEventWindowsTab = ({ eventId, eventStartsAt, eventEndsAt }: HostEventWindowsTabProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const formScrollRef = useRef<ScrollView>(null);
  const [windows, setWindows] = useState<EventWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingWindow, setEditingWindow] = useState<EventWindow | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [form, setForm] = useState(() => createInitialForm(eventStartsAt, eventEndsAt));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingWindowId, setCancellingWindowId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const eventStart = useMemo(() => parseDate(eventStartsAt), [eventStartsAt]);
  const eventEnd = useMemo(() => parseDate(eventEndsAt), [eventEndsAt]);
  const isOpenEdit = editingWindow?.computedStatus === "open";

  const loadWindows = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setWindows(await getEventWindows(eventId));
    } catch (error) {
      setLoadError(getAuthErrorMessage(error, "Unable to load event windows."));
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadWindows();
  }, [loadWindows]);

  const openCreateForm = () => {
    setEditingWindow(null);
    setForm(createInitialForm(eventStartsAt, eventEndsAt));
    setFormError(null);
    setPickerTarget(null);
    setIsFormVisible(true);
  };

  const openEditForm = (window: EventWindow) => {
    setEditingWindow(window);
    setForm(createInitialForm(eventStartsAt, eventEndsAt, window));
    setFormError(null);
    setPickerTarget(null);
    setIsFormVisible(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    Keyboard.dismiss();
    setPickerTarget(null);
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
    if (form.startsAt >= form.endsAt) return "Window end time must be after its start time.";
    if (form.startsAt < eventStart || form.endsAt > eventEnd) return "Window times must stay inside the event time.";
    if (editingWindow && maxPosts < editingWindow.acceptedPostCount) {
      return `Maximum posts cannot be lower than ${editingWindow.acceptedPostCount} accepted posts.`;
    }
    return null;
  };

  const saveWindow = async () => {
    Keyboard.dismiss();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      scrollFormToEnd();
      return;
    }

    const payload: EventWindowPayload = {
      title: form.title.trim() || null,
      startsAt: form.startsAt.toISOString(),
      endsAt: form.endsAt.toISOString(),
      allowedContentTypes: form.allowedContentTypes,
      maxPosts: Number(form.maxPosts),
    };

    setIsSaving(true);
    setFormError(null);
    try {
      const saved = editingWindow
        ? await updateEventWindow(eventId, editingWindow.id, isOpenEdit
          ? { title: payload.title, endsAt: payload.endsAt, maxPosts: payload.maxPosts }
          : payload)
        : await createEventWindow(eventId, payload);
      setWindows((current) => {
        const next = editingWindow
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [...current, saved];
        return next.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
      });
      setIsFormVisible(false);
    } catch (error) {
      setFormError(getAuthErrorMessage(error, "Unable to save this window."));
      scrollFormToEnd();
    } finally {
      setIsSaving(false);
    }
  };

  const confirmCancel = (window: EventWindow) => {
    Alert.alert(
      "Cancel window?",
      "This window will stop accepting posts. This action cannot be undone.",
      [
        { text: "Keep Window", style: "cancel" },
        {
          text: "Cancel Window",
          style: "destructive",
          onPress: async () => {
            setCancellingWindowId(window.id);
            try {
              const cancelled = await cancelEventWindow(eventId, window.id);
              setWindows((current) => current.map((item) => item.id === cancelled.id ? cancelled : item));
            } catch (error) {
              Alert.alert("Unable to cancel window", getAuthErrorMessage(error));
            } finally {
              setCancellingWindowId(null);
            }
          },
        },
      ],
    );
  };

  const renderWindow = (window: EventWindow) => {
    const canManage = window.computedStatus === "scheduled" || window.computedStatus === "open";
    const statusColor = STATUS_COLORS[window.computedStatus];

    return (
      <View key={window.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {window.title?.trim() || "Untitled window"}
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
              accessibilityLabel={`Edit ${window.title || "window"}`}
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
            <Text style={[styles.cancelActionText, { color: colors.danger }]}>Cancel window</Text>
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
          <Text style={[styles.heading, { color: colors.text }]}>Posting windows</Text>
        </View>
        <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.text }]} onPress={openCreateForm}>
          <Feather name="plus" size={18} color={colors.background} />
          <Text style={[styles.createButtonText, { color: colors.background }]}>Create</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : loadError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={28} color={colors.danger} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Windows unavailable</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{loadError}</Text>
          <TouchableOpacity style={[styles.retryButton, { borderColor: colors.border }]} onPress={() => void loadWindows()}>
            <Feather name="refresh-cw" size={16} color={colors.text} />
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : windows.length === 0 ? (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Feather name="clock" size={30} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No posting windows yet</Text>
        </View>
      ) : windows.map(renderWindow)}

      <Modal
        visible={isFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={[styles.modal, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            <TouchableOpacity style={styles.iconButton} onPress={closeForm} disabled={isSaving} accessibilityLabel="Close window form">
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingWindow ? "Edit window" : "Create window"}</Text>
            <View style={styles.iconButton} />
          </View>

          <ScrollView
            ref={formScrollRef}
            style={styles.formScroll}
            contentContainerStyle={[
              styles.formContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 32 },
            ]}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isOpenEdit ? (
              <View style={[styles.notice, { backgroundColor: isDark ? "#172033" : "#EFF6FF" }]}>
                <Feather name="info" size={17} color="#3B82F6" />
                <Text style={[styles.noticeText, { color: colors.text }]}>This window is open. Its start time and content types can no longer be changed.</Text>
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
              {EVENT_WINDOW_CONTENT_TYPES.map((type) => {
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
                  paddingBottom: insets.bottom,
                },
              ]}
            >
              {Platform.OS === "ios" ? <TouchableOpacity style={styles.pickerDone} onPress={() => setPickerTarget(null)}><Text style={[styles.saveText, { color: colors.primary }]}>Done</Text></TouchableOpacity> : null}
              <DateTimePicker
                value={pickerValue}
                mode={pickerMode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={pickerMode === "date" ? eventStart : undefined}
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
                paddingBottom: Math.max(insets.bottom, 12),
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

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
  formScroll: { flex: 1 },
  formContent: { padding: 20, paddingBottom: 48 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderRadius: 8, marginBottom: 20 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 11, fontWeight: "700", marginBottom: 8, marginTop: 18 },
  input: { minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 14, fontSize: 15 },
  selectorRow: { flexDirection: "row", gap: 10 },
  selector: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  selectorText: { flexShrink: 1, fontSize: 13, fontWeight: "600" },
  contentSelector: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  contentOption: { width: "48%", minHeight: 46, flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  contentOptionText: { flex: 1, fontSize: 13, fontWeight: "600" },
  fieldHint: { fontSize: 12, marginTop: 7 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 20 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  pickerContainer: { borderTopWidth: StyleSheet.hairlineWidth },
  pickerDone: { alignSelf: "flex-end", paddingVertical: 8, paddingRight: 10 },
  formActions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  formActionButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  formCancelText: { fontSize: 15, fontWeight: "700" },
  formSaveText: { fontSize: 15, fontWeight: "700" },
});
