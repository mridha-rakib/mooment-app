import EventPickerModal from '@/components/post/EventPickerModal';
import { useTheme } from '@/hooks/useTheme';
import { Feather } from '@expo/vector-icons';
import {
  Calendar03Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  Settings02Icon,
  Share01Icon,
  SpoonAndForkIcon,
  UserAdd01Icon,
  UserGroupIcon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions,
  Image, Modal, Platform,
  Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlanStore } from '@/stores/planStore';
import type { PlanEvent, PlanFriend } from '@/stores/planStore';

/* ─── Constants ─── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_HDR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function getMonthRange(y: number, m: number) {
  return {
    from: new Date(y, m, 1, 0, 0, 0, 0).toISOString(),
    to: new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString(),
  };
}
function parseIntegerParam(value?: string) {
  const parsed = value ? parseInt(value, 10) : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}
function getTimeMinutes(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const [, hourValue, minuteValue, periodValue] = match;
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const period = periodValue.toUpperCase();
  const normalizedHour = period === 'PM' && hour !== 12 ? hour + 12 : period === 'AM' && hour === 12 ? 0 : hour;

  return normalizedHour * 60 + minute;
}

/* ─── Time slots for the timeline ─── */
const TIME_SLOTS = ['6:00 PM', '7:00 PM'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EVENT_CAPSULE_WIDTH = 146;
const WIDE_CARD_WIDTH = Math.min(358, SCREEN_WIDTH - 34);
const CENTERED_CAPSULE_TRANSLATE_X = Math.max(0, (SCREEN_WIDTH / 2) - 32 - (EVENT_CAPSULE_WIDTH / 2));
const EVENT_CARD_ACTIVE = {
  background: '#111111',
  border: '#B3B3B3',
  iconBorder: '#777777',
  muted: '#9A9898',
  text: '#FFFFFF',
};
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';

const getFriendInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

export default function MyPlanScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rawParams = useLocalSearchParams<{ focusYear?: string; focusMonth?: string; focusDay?: string }>();
  const parsedFocusYear = parseIntegerParam(rawParams.focusYear);
  const parsedFocusMonth = parseIntegerParam(rawParams.focusMonth);
  const parsedFocusDay = parseIntegerParam(rawParams.focusDay);
  const focusYear = parsedFocusYear;
  const focusMonth = parsedFocusMonth !== null && parsedFocusMonth >= 0 && parsedFocusMonth <= 11 ? parsedFocusMonth : null;
  const focusDay = parsedFocusDay !== null && parsedFocusDay >= 1 && parsedFocusDay <= 31 ? parsedFocusDay : null;
  const plans = usePlanStore((state) => state.plans);
  const isPlansLoading = usePlanStore((state) => state.isLoading);
  const plansError = usePlanStore((state) => state.error);
  const deletePlan = usePlanStore((state) => state.deletePlan);
  const restorePlans = usePlanStore((state) => state.restorePlans);

  const now = new Date();
  const [calYear, setCalYear] = useState(() => focusYear ?? now.getFullYear());
  const [calMonth, setCalMonth] = useState(() => focusMonth ?? now.getMonth());
  const [selectedDay, setSelectedDay] = useState(() => focusDay ?? now.getDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const appliedFocusKeyRef = useRef<string | null>(null);

  const handleAddEvent = () => {
    setEvents([
      ...events,
      {
        id: Math.random().toString(), day: selectedDay, month: calMonth, year: calYear, time: '6:00 PM',
        title: planName || 'Dinner', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
        friendIds: [],
        friendNames: [],
        friendUsers: [],
        venue: planLocation || 'Rooftop Series Vol.4',
      }
    ]);
    setIsCreatePlanModalVisible(false); // Close the modal when done
  };
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [isCreatePlanModalVisible, setIsCreatePlanModalVisible] = useState(false);
  const [isSelectEventModalVisible, setIsSelectEventModalVisible] = useState(false);

  const [planName, setPlanName] = useState('');
  const [planDate] = useState('Sep 9, 2026');
  const [planTime] = useState('10:00 AM');
  const [selectedEventRadio, setSelectedEventRadio] = useState<string | null>(null);
  const [planLocation] = useState('123, Main Street NYC');
  const [selectedFriends] = useState<string[]>([]);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [centeredEventId, setCenteredEventId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const handleDeletePlan = (plan: PlanEvent) => {
    if (deletingPlanId) {
      return;
    }

    Alert.alert(
      'Delete plan',
      `Remove "${plan.title}" from your plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingPlanId(plan.id);

            try {
              await deletePlan(plan.id);
              setCenteredEventId((currentId) => currentId === plan.id ? null : currentId);
            } catch {
              Alert.alert('Unable to delete plan', 'Please try again.');
            } finally {
              setDeletingPlanId((currentId) => currentId === plan.id ? null : currentId);
            }
          },
        },
      ],
    );
  };

  const visibleMonthRange = useMemo(() => getMonthRange(calYear, calMonth), [calMonth, calYear]);

  useEffect(() => {
    void restorePlans(visibleMonthRange);
  }, [restorePlans, visibleMonthRange]);

  const focusKey = focusYear !== null && focusMonth !== null && focusDay !== null
    ? `${focusYear}-${focusMonth}-${focusDay}`
    : null;

  useEffect(() => {
    if (!focusKey || focusYear === null || focusMonth === null || focusDay === null || appliedFocusKeyRef.current === focusKey) {
      return;
    }

    setCalYear(focusYear);
    setCalMonth(focusMonth);
    setSelectedDay(focusDay);
    setCalendarOpen(true);
    appliedFocusKeyRef.current = focusKey;
  }, [focusKey, focusYear, focusMonth, focusDay]);

  useEffect(() => {
    setEvents(plans);
  }, [plans]);

  const highlightedDays = useMemo(
    () => new Set(events.filter((event) => event.year === calYear && event.month === calMonth).map((event) => event.day)),
    [calMonth, calYear, events],
  );
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDay(calYear, calMonth);

  const selectedDate = new Date(calYear, calMonth, selectedDay);
  const fullDayLabel = `${DAY_NAMES[selectedDate.getDay()]}, ${SHORT_MONTHS[calMonth]} ${selectedDay}`;

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); setSelectedDay(1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); setSelectedDay(1); };

  const calendarRows = useMemo(() => {
    const rows: (number | null)[][] = [];
    let row: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) { row.push(d); if (row.length === 7) { rows.push(row); row = []; } }
    if (row.length) { while (row.length < 7) row.push(null); rows.push(row); }
    return rows;
  }, [daysInMonth, firstDay]);

  const dayEvents = useMemo(
    () => events
      .filter(e => e.year === calYear && e.month === calMonth && e.day === selectedDay)
      .sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
        return getTimeMinutes(a.time) - getTimeMinutes(b.time);
      }),
    [calMonth, calYear, events, selectedDay],
  );
  const selectedPlanForMenu = useMemo(
    () => dayEvents.find((event) => event.id === centeredEventId) ?? dayEvents[0] ?? null,
    [centeredEventId, dayEvents],
  );

  const hasAnyEvents = events.some((event) => event.year === calYear && event.month === calMonth);
  const displayedTimeSlots = useMemo(() => {
    // When the selected day has real plans, show only those plans' time slots.
    // Only fall back to hardcoded placeholder slots when there are no plans for the day.
    const base = dayEvents.length > 0 ? dayEvents.map((e) => e.time) : TIME_SLOTS;
    return [...new Set(base)].sort((a, b) => getTimeMinutes(a) - getTimeMinutes(b));
  }, [dayEvents]);

  return (
    <View style={[s.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>My Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Month toggle */}
        <TouchableOpacity style={s.monthRow} activeOpacity={0.7} onPress={() => setCalendarOpen(!calendarOpen)}>
          <Text style={[s.monthText, { color: colors.text }]}>{MONTHS[calMonth]}</Text>
          <Feather name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.text} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <View style={s.dayHeaderRow}>
          <Text style={[s.dayHeaderText, { color: colors.textSecondary }]}>{fullDayLabel}</Text>
          <TouchableOpacity style={[s.dayMenuBtn, { backgroundColor: colors.card }]} activeOpacity={0.7} onPress={() => setIsMoreMenuVisible(true)}>
            <HugeiconsIcon icon={MoreHorizontalIcon} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ═══ Calendar ═══ */}
        {calendarOpen && (
          <View style={{ marginBottom: 24, marginTop: 12 }}>
            <View style={s.calendarHeaderWrap}>
              <Text style={[s.bigDay, { color: colors.text }]}>{fullDayLabel}</Text>
              <View style={[s.calendarLine, { backgroundColor: colors.border }]} />
            </View>
            <View style={s.calNav}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[s.calNavLabel, { color: colors.text }]}>{MONTHS[calMonth]} {calYear}</Text>
                <Feather name="chevron-down" size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
              <View style={s.calNavArrows}>
                <TouchableOpacity onPress={prevMonth} style={s.calArrow} activeOpacity={0.7}><Feather name="chevron-left" size={14} color={colors.text} /></TouchableOpacity>
                <TouchableOpacity onPress={nextMonth} style={s.calArrow} activeOpacity={0.7}><Feather name="chevron-right" size={14} color={colors.text} /></TouchableOpacity>
              </View>
            </View>
            <View style={s.calHdrRow}>{DAYS_HDR.map((d, i) => <Text key={i} style={[s.calHdr, { color: colors.text }]}>{d}</Text>)}</View>
            {calendarRows.map((row, ri) => (
              <View key={ri} style={s.calWeek}>
                {row.map((day, ci) => {
                  if (!day) return <View key={ci} style={s.calCell} />;
                  const sel = day === selectedDay;
                  const hl = highlightedDays.has(day);
                  return (
                    <TouchableOpacity key={ci} style={[s.calCell, sel && [s.calCellSel, { backgroundColor: colors.border }], hl && !sel && [s.calCellHl, { borderColor: colors.primary }]]} onPress={() => setSelectedDay(day)} activeOpacity={0.7}>
                      <Text style={[s.calDay, { color: colors.text }, sel && s.calDaySel, hl && !sel && [s.calDayHl, { color: colors.text }]]}>{day}</Text>
                      {hl && <View style={[s.calEventDot, { backgroundColor: sel ? colors.text : colors.primary }]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ═══ Timeline ═══ */}
        {hasAnyEvents && <Text style={[s.yourPlanLabel, { color: colors.text }]}>Your Plan</Text>}
        {isPlansLoading && (
          <View style={s.planStatusRow}>
            <ActivityIndicator color={colors.textSecondary} />
            <Text style={[s.planStatusText, { color: colors.textSecondary }]}>Loading plans...</Text>
          </View>
        )}
        {!isPlansLoading && plansError && (
          <Text style={[s.planErrorText, { color: colors.primary }]}>{plansError}</Text>
        )}
        <View style={s.timelineContainer}>
          <View style={[s.timelineVerticalLine, { backgroundColor: colors.border }]} />
          {displayedTimeSlots.map((slot) => {
            const ev = dayEvents.find(e => e.time === slot);
            return (
              <TimelineSlot
                key={slot}
                slot={slot}
                ev={ev}
                isCentered={centeredEventId === ev?.id}
                onToggleCenter={() => setCenteredEventId(centeredEventId === ev?.id ? null : (ev?.id || null))}
                onAddPress={() => router.push('/plan-screen/create-plan' as any)}
                isDeleting={deletingPlanId === ev?.id}
                onDelete={() => {
                  if (ev) {
                    handleDeletePlan(ev);
                  }
                }}
                colors={colors}
              />
            );
          })}
        </View>

      </ScrollView>

      {/* More Options Menu */}
      <Modal visible={isMoreMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMoreMenuVisible(false)}>
        <TouchableOpacity style={s.moreOverlay} activeOpacity={1} onPress={() => setIsMoreMenuVisible(false)}>
          <View style={[s.moreMenuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.moreMenuHeader, { display: 'none' }]}>more</Text>
            {[
              { label: 'Create Plan', icon: Calendar03Icon, isCreate: true },
              { label: 'Edit Plan', icon: PencilEdit01Icon },
              { label: 'Add Friend', icon: UserAdd01Icon, route: '/plan-screen/add-friend' },
              { label: 'Tagged Friends', icon: UserGroupIcon, route: '/plan-screen/tagged-friends' },
              { label: 'Share Plan', icon: Share01Icon, route: '/plan-screen/share-plan' },
              { label: 'Edit Permission', icon: Settings02Icon, route: '/plan-screen/edit-permission' },
              { label: 'Delete', icon: Delete02Icon, color: colors.primary },
            ].map((item, idx) => (
              <View key={item.label}>
                {idx > 0 && <View style={[s.moreMenuSeparator, { backgroundColor: colors.border }]} />}
                <TouchableOpacity style={s.moreMenuItem} activeOpacity={0.8} onPress={() => {
                  setIsMoreMenuVisible(false);
                  if (item.isCreate) {
                    router.push('/plan-screen/create-plan' as any);
                  } else if (item.label === 'Add Friend') {
                    if (selectedPlanForMenu) {
                      router.push({
                        pathname: '/plan-screen/add-friend' as any,
                        params: { planId: selectedPlanForMenu.id },
                      });
                    } else {
                      Alert.alert('No plan selected', 'Select a day with a plan before adding friends.');
                    }
                  } else if (item.route) {
                    router.push(item.route as any);
                  } else if (item.label === 'Delete') {
                    if (selectedPlanForMenu) {
                      handleDeletePlan(selectedPlanForMenu);
                    } else {
                      Alert.alert('No plan selected', 'Select a day with a plan before deleting.');
                    }
                  }
                }}>
                  <HugeiconsIcon icon={item.icon} size={18} color={item.color || colors.text} style={s.moreMenuIcon} />
                  <Text style={[s.moreMenuText, { color: item.color || colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Unified Create Plan Modal */}
      <Modal visible={isCreatePlanModalVisible} transparent animationType="slide" onRequestClose={() => setIsCreatePlanModalVisible(false)}>
        <Pressable style={s.bottomSheetOverlay} onPress={() => setIsCreatePlanModalVisible(false)}>
          <Pressable style={[s.bottomSheetContainer, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setIsCreatePlanModalVisible(false)} style={[s.closeBtnCircle, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="x" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.text }]}>Create Plan</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>PLAN NAME</Text>
                <TextInput
                  style={[s.premiumInput, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="Name"
                  placeholderTextColor={colors.textSecondary}
                  value={planName}
                  onChangeText={setPlanName}
                />
              </View>

              <View style={s.rowGroup}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>DATE</Text>
                  <TouchableOpacity style={[s.iconInput, { backgroundColor: colors.background }]}>
                    <Feather name="calendar" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={[s.iconInputText, { color: colors.text }]}>{planDate}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>TIME</Text>
                  <TouchableOpacity style={[s.iconInput, { backgroundColor: colors.background }]}>
                    <Feather name="clock" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={[s.iconInputText, { color: colors.text }]}>{planTime}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>EVENT</Text>
                <TouchableOpacity style={[s.iconInput, { backgroundColor: colors.background }]} onPress={() => setIsSelectEventModalVisible(true)}>
                  <Text style={[s.iconInputText, { color: colors.text }, !selectedEventRadio && { color: colors.textSecondary }]}>
                    {selectedEventRadio ? 'Rooftop Session Vol.4' : 'Select Event'}
                  </Text>
                  <Feather name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>LOCATION</Text>
                <TouchableOpacity style={[s.iconInput, { backgroundColor: colors.background }]} onPress={() => setIsMapModalVisible(true)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Feather name="map-pin" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={[s.iconInputText, { color: colors.text }]}>{planLocation}</Text>
                  </View>
                  <Feather name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>ADD FRIENDS</Text>
                <TouchableOpacity style={[s.iconInput, { backgroundColor: colors.background }]} onPress={() => router.push('/plan-screen/add-friend' as any)}>
                  <Text style={[s.iconInputText, { color: colors.text }, selectedFriends.length === 0 && { color: colors.textSecondary }]}>
                    {selectedFriends.length > 0 ? `${selectedFriends.length} Friends Selected` : 'Select Friends'}
                  </Text>
                  <Feather name="chevron-down" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={[s.bottomSheetActionRow, { marginTop: 40 }]}>
                <TouchableOpacity style={[s.cancelBtnPremium, { borderColor: colors.border }]} onPress={() => setIsCreatePlanModalVisible(false)}>
                  <Text style={[s.cancelBtnTextPremium, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.addBtnPremium, { backgroundColor: colors.primary }]} onPress={() => { setIsCreatePlanModalVisible(false); handleAddEvent(); }}>
                  <Text style={[s.addBtnTextPremium, { color: colors.background }]}>Done</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Map Selection Modal */}
      <Modal visible={isMapModalVisible} transparent animationType="slide" onRequestClose={() => setIsMapModalVisible(false)}>
        <View style={[s.mapContainer, { backgroundColor: colors.background }]}>
          <Image
            source={isDark ? require('../../assets/images/dark-map.png') : require('../../assets/images/map_bg.png')}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <SafeAreaView style={{ flex: 1 }}>
            <View style={[s.modalHeader, { paddingHorizontal: 20, marginTop: Platform.OS === 'android' ? 20 : 0 }]}>
              <TouchableOpacity onPress={() => setIsMapModalVisible(false)} style={[s.closeBtnCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="chevron-left" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.text }]}>Map</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={s.mapSearchWrapper}>
              <View style={[s.mapSearchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="map-pin" size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
                <Text style={[s.mapSearchText, { color: colors.text }]}>{planLocation}</Text>
              </View>
            </View>

            <View style={s.pinContainer}>
              <View style={s.pinWrapper}>
                <View style={[s.pinCircle, { backgroundColor: colors.primary + 'CC' }]}>
                  <View style={[s.pinDot, { backgroundColor: colors.background }]} />
                </View>
                <View style={[s.pinLine, { backgroundColor: colors.primary }]} />
              </View>
            </View>

            <View style={s.mapFooter}>
              <TouchableOpacity style={[s.cancelBtnPremium, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setIsMapModalVisible(false)}>
                <Text style={[s.cancelBtnTextPremium, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.addBtnPremium, { backgroundColor: colors.primary }]} onPress={() => { setIsMapModalVisible(false); setIsCreatePlanModalVisible(false); handleAddEvent(); }}>
                <Text style={[s.addBtnTextPremium, { color: colors.background }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <EventPickerModal
        visible={isSelectEventModalVisible}
        onClose={() => setIsSelectEventModalVisible(false)}
        onSelect={(event) => {
          setSelectedEventRadio(event.title);
          setIsSelectEventModalVisible(false);
        }}
      />
    </View>
  );
}

/* ─── Sub-Component for individual slot animation ─── */
function TimelineSlot({ slot, ev, isCentered, onToggleCenter, onAddPress, onDelete, isDeleting, colors }: {
  slot: string, ev?: PlanEvent, isCentered: boolean, onToggleCenter: () => void, onAddPress: () => void, onDelete: () => void, isDeleting?: boolean, colors: any
}) {
  const router = useRouter();
  const alignAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(alignAnim, {
      toValue: isCentered ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start();
  }, [alignAnim, isCentered]);

  const capsuleTranslateX = alignAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CENTERED_CAPSULE_TRANSLATE_X]
  });

  const cardBackground = isCentered ? EVENT_CARD_ACTIVE.background : colors.background;
  const cardBorder = isCentered ? EVENT_CARD_ACTIVE.border : colors.border;
  const iconBackground = isCentered ? 'rgba(17, 17, 17, 0.8)' : colors.card;
  const iconBorder = isCentered ? EVENT_CARD_ACTIVE.iconBorder : colors.border;
  const iconColor = isCentered ? EVENT_CARD_ACTIVE.text : colors.primary;
  const titleColor = isCentered ? EVENT_CARD_ACTIVE.text : colors.text;
  const secondaryColor = isCentered ? EVENT_CARD_ACTIVE.muted : colors.textSecondary;
  const avatarBorder = isCentered ? EVENT_CARD_ACTIVE.background : colors.background;
  const wideVenue = ev?.location && ev.venue && ev.location !== ev.venue
    ? `${ev.venue} at ${ev.location}`
    : `${ev?.venue || 'Rooftop Series Vol.4'} at 123, Ave NYC`;

  const friends = ev?.friendUsers ?? [];
  const friendSummary = friends.length === 0 ? 'No friends added' : `${friends.length} friend${friends.length === 1 ? '' : 's'}`;

  const renderFriendAvatar = (friend: PlanFriend, index: number, borderColor: string) => {
    const marginLeft = index === 0 ? 0 : -8;

    if (friend.avatarUrl || friend.avatarKey) {
      return (
        <Image
          key={friend.id}
          source={{ uri: friend.avatarUrl || DEFAULT_AVATAR }}
          style={[s.capsuleAvatar, { borderColor, marginLeft }]}
        />
      );
    }

    return (
      <View key={friend.id} style={[s.initialsAvatar, { borderColor, marginLeft }]}>
        <Text style={s.initialsText}>{getFriendInitials(friend.name)}</Text>
      </View>
    );
  };

  const renderAvatars = (borderColor: string) => (
    <View style={s.avatarGroup}>
      {friends.length > 0
        ? friends.map((friend, index) => renderFriendAvatar(friend, index, borderColor))
        : <Text style={[s.noFriendsText, { color: secondaryColor }]}>No friends</Text>}
    </View>
  );

  return (
    <View style={s.timeSlotWrap}>
      <Text style={[s.timeLabel, { color: colors.textSecondary }]}>{slot}</Text>
      <View style={[s.dashedLine, { borderColor: colors.border }]} />
      <View style={s.slotContent}>
        {ev ? (
          <View style={s.eventSlotContent}>
            <Animated.View style={{ transform: [{ translateX: capsuleTranslateX }] }}>
              <TouchableOpacity
                style={[s.eventCapsule, { backgroundColor: cardBackground, borderColor: cardBorder }]}
                activeOpacity={0.85}
                onPress={onToggleCenter}
              >
                <View style={[s.capsuleIconWrap, { backgroundColor: iconBackground, borderColor: iconBorder }]}>
                  <HugeiconsIcon icon={SpoonAndForkIcon} size={20} color={iconColor} />
                </View>
                <View style={s.capsuleTextBlock}>
                  <Text style={[s.capsuleTitle, { color: titleColor }]} numberOfLines={1}>{ev.title}</Text>
                  <Text style={[s.capsuleVenue, { color: secondaryColor }]} numberOfLines={1}>{ev.venue}</Text>
                  <Text style={[s.capsuleTime, { color: secondaryColor }]}>{ev.time}</Text>
                </View>
                <Image source={{ uri: ev.image }} style={s.capsuleImg} />

                <View style={s.capsuleAvatarsRow}>
                  {renderAvatars(avatarBorder)}
                  {friends.length > 0 && (
                    <Text style={[s.capsuleMoreText, { color: secondaryColor }]}>{friendSummary}</Text>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>

            {isCentered && (
              <View style={s.expandedDetailWrap}>
                <View style={[s.nodeConnector, { backgroundColor: EVENT_CARD_ACTIVE.iconBorder }]} />
                <TouchableOpacity
                  style={[s.wideCard, { backgroundColor: EVENT_CARD_ACTIVE.background, borderColor: EVENT_CARD_ACTIVE.border }]}
                  activeOpacity={0.9}
                  onPress={onToggleCenter}
                >
                  <View style={[s.wideCardIconWrap, { backgroundColor: 'rgba(17, 17, 17, 0.8)', borderColor: EVENT_CARD_ACTIVE.iconBorder }]}>
                    <HugeiconsIcon icon={SpoonAndForkIcon} size={20} color={EVENT_CARD_ACTIVE.text} />
                  </View>
                  <View style={s.wideCardContent}>
                    <View style={s.wideCardInfo}>
                      <View style={s.wideCardTextBlock}>
                        <Text style={[s.wideCardTitle, { color: EVENT_CARD_ACTIVE.text }]} numberOfLines={1}>{ev.title}</Text>
                        <Text style={[s.wideCardVenue, { color: EVENT_CARD_ACTIVE.text }]} numberOfLines={1}>{wideVenue}</Text>
                      </View>
                      <View style={s.wideCardMiddle}>
                        {renderAvatars(EVENT_CARD_ACTIVE.background)}
                        <Text style={[s.wideCardMoreText, { color: EVENT_CARD_ACTIVE.muted }]}>{friendSummary}</Text>
                        <View style={s.metaDot} />
                        <Text style={[s.wideCardMoreText, { color: EVENT_CARD_ACTIVE.muted }]}>{ev.time}</Text>
                      </View>
                    </View>
                    <View style={s.wideCardFooter}>
                      <View style={s.footerIcons}>
                        <TouchableOpacity
                          style={s.footerIcon}
                          hitSlop={8}
                          onPress={() => router.push('/plan-screen/share-plan')}
                        >
                          <HugeiconsIcon icon={Share01Icon} size={20} color={EVENT_CARD_ACTIVE.border} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.footerIcon, isDeleting && s.footerIconDisabled]}
                          hitSlop={8}
                          onPress={onDelete}
                          disabled={isDeleting}
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={20} color={isDeleting ? EVENT_CARD_ACTIVE.muted : EVENT_CARD_ACTIVE.border} />
                        </TouchableOpacity>
                      </View>
                      <View style={s.footerActions}>
                        <TouchableOpacity
                          style={[s.viewBtnSmall, !ev.eventId && { opacity: 0.4 }]}
                          disabled={!ev.eventId}
                          onPress={() => router.push({ pathname: '/event-screen/event' as any, params: { eventId: ev.eventId! } })}
                        >
                          <Text style={s.viewBtnTextSmall}>View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.addedPillSmall}
                          activeOpacity={0.8}
                          onPress={() => router.push({
                            pathname: '/plan-screen/add-friend' as any,
                            params: { planId: ev.id },
                          })}
                        >
                          <Feather name="check" size={14} color={EVENT_CARD_ACTIVE.background} />
                          <Text style={s.addedTextSmall}>Added</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={{ width: '100%', paddingVertical: 20, paddingLeft: 40 }}>
            <TouchableOpacity style={[s.emptySlotBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8} onPress={onAddPress}>
              <Feather name="plus" size={18} color={colors.textSecondary} />
              <Text style={[s.emptySlotBtnText, { color: colors.textSecondary }]}>Add Event</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    justifyContent: 'space-between'
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: { fontWeight: '700', fontSize: 17 },

  monthRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8, marginTop: 10 },
  monthText: { fontSize: 18, fontWeight: '700' },

  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dayHeaderText: { fontSize: 15, fontWeight: '600' },
  dayMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },

  scroll: { flexGrow: 1, paddingBottom: 100 },

  /* Empty state */
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: 40 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  emptyDesc: { fontSize: 13, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  discoverBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  discoverText: { fontSize: 15, fontWeight: 'bold' },

  /* Centered View Modal Styles */
  centeredViewContainer: { flex: 1 },

  /* Empty Slot Styles */
  emptySlotBtn: {
    width: 90,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  emptySlotBtnText: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  /* Timeline */
  yourPlanLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, paddingHorizontal: 20 },
  planStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  planStatusText: { fontSize: 13, fontWeight: '600' },
  planErrorText: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 16 },

  timelineContainer: { position: 'relative', marginTop: 0 },
  timelineVerticalLine: { position: 'absolute', left: 24, top: 0, bottom: 0, width: 1 },

  timeSlotWrap: { marginBottom: 32, position: 'relative' },
  timeLabel: { fontSize: 12, marginBottom: 12, marginLeft: 32, fontWeight: '600' },
  dashedLine: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', marginLeft: 24, marginRight: 20, position: 'absolute', top: 6, left: 0, right: 0 },

  slotContent: { paddingLeft: 32, marginTop: 10, paddingRight: 20 },
  eventSlotContent: { width: '100%', alignItems: 'flex-start' },
  expandedDetailWrap: { alignItems: 'center', width: '100%' },

  eventCapsule: {
    width: EVENT_CAPSULE_WIDTH,
    minHeight: 236,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  capsuleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleTextBlock: { alignItems: 'center', gap: 4, width: 114 },
  capsuleTitle: { fontSize: 14, fontWeight: '600', lineHeight: 16, textAlign: 'center', width: '100%' },
  capsuleVenue: { fontSize: 12, lineHeight: 16, textAlign: 'center', width: '100%' },
  capsuleTime: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  capsuleImg: { width: 80, height: 40, borderRadius: 12 },
  capsuleAvatarsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 20, maxWidth: 116, flexWrap: 'wrap', justifyContent: 'center' },
  avatarGroup: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  capsuleAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.2 },
  initialsAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.2,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: { color: '#FFFFFF', fontSize: 8, fontWeight: '700' },
  noFriendsText: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
  capsuleMoreText: { fontSize: 12, lineHeight: 16 },

  /* Node + Wide Card */
  nodeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  nodeConnector: { width: 1, height: 32 },
  wideCard: {
    width: WIDE_CARD_WIDTH,
    minHeight: 160,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 200,
    paddingTop: 20,
    paddingRight: SCREEN_WIDTH < 380 ? 24 : 40,
    paddingBottom: 20,
    paddingLeft: 8,
    gap: 20,
  },
  wideCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wideCardContent: { flex: 1, minHeight: 120, justifyContent: 'space-between' },
  wideCardInfo: { gap: 12 },
  wideCardTextBlock: { gap: 4 },
  wideCardTitle: { fontSize: 14, fontWeight: '600', lineHeight: 16 },
  wideCardVenue: { fontSize: 12, lineHeight: 16 },
  wideCardMiddle: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 20 },
  wideCardMoreText: { fontSize: 12, lineHeight: 16 },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: EVENT_CARD_ACTIVE.border },

  wideCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerIcons: { flexDirection: 'row', alignItems: 'center', gap: 20, width: 60 },
  footerIcon: { padding: 4 },
  footerIconDisabled: { opacity: 0.45 },
  footerActions: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  viewBtnSmall: { width: 49, height: 32, borderRadius: 8, backgroundColor: 'rgba(17, 17, 17, 0.8)', justifyContent: 'center', alignItems: 'center' },
  viewBtnTextSmall: { color: EVENT_CARD_ACTIVE.text, fontSize: 14, lineHeight: 16, fontWeight: '500' },
  addedPillSmall: {
    width: 76,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: 8,
    gap: 4,
    backgroundColor: EVENT_CARD_ACTIVE.border,
  },
  addedTextSmall: { color: EVENT_CARD_ACTIVE.background, fontSize: 14, lineHeight: 16, fontWeight: '500' },

  /* Calendar Header Styles */
  calendarHeaderWrap: { marginBottom: 20, paddingHorizontal: 20 },
  bigDay: { fontSize: 28, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  calendarLine: { height: 1, width: '100%' },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 4, paddingHorizontal: 20 },
  calNavLabel: { fontSize: 13, fontWeight: '600' },
  calNavArrows: { flexDirection: 'row', gap: 16 },
  calArrow: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  calHdrRow: { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 10 },
  calHdr: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  calWeek: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 10 },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  calCellSel: { borderRadius: 20, width: 40, height: 40 },
  calCellHl: { borderRadius: 20, width: 40, height: 40, borderWidth: 1 },
  calDay: { fontSize: 14 },
  calDaySel: { fontWeight: '700' },
  calDayHl: {},
  calEventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  /* Bottom Sheets & Modals */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 80 },
  popup: { borderRadius: 20, padding: 20, width: '85%', alignItems: 'center', borderWidth: 1 },
  popupTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  popupVenue: { fontSize: 12, marginBottom: 4 },
  popupTime: { fontSize: 12, marginBottom: 20 },
  popupBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  popupBtnMore: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  popupBtnMoreText: { fontSize: 14, fontWeight: '600' },
  popupBtnLeave: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  popupBtnLeaveText: { fontSize: 14, fontWeight: '700' },

  moreOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-start', alignItems: 'flex-end' },
  moreMenuContainer: { width: 180, borderRadius: 16, marginTop: 140, marginRight: 20, overflow: 'hidden', borderWidth: 1, elevation: 5 },
  moreMenuHeader: { display: 'none' },
  moreMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18 },
  moreMenuIcon: { marginRight: 12 },
  moreMenuText: { fontSize: 14, fontWeight: '400' },
  moreMenuSeparator: { height: 1 },

  addEventContainer: { alignSelf: 'center' },
  addEventBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  addEventBtnText: { fontSize: 13, fontWeight: '600' },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheetContainer: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 50 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  bottomSheetTitle: { fontSize: 19, fontWeight: '700', marginBottom: 24, textAlign: 'center' },

  searchContainerPremium: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, height: 52, marginBottom: 24, borderWidth: 1 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15 },

  emptyEventBox: { alignItems: 'center', marginVertical: 40 },
  emptyEventTextLarge: { fontSize: 14, textAlign: 'center', marginBottom: 32, paddingHorizontal: 30, lineHeight: 22 },
  browseBtnLarge: { width: '100%', height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  browseBtnTextLarge: { fontSize: 16, fontWeight: '700' },

  bottomSheetActionRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  cancelBtnPremium: { flex: 1, height: 54, borderRadius: 14, backgroundColor: 'transparent', borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cancelBtnTextPremium: { fontSize: 16, fontWeight: '600' },
  addBtnPremium: { flex: 1, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  addBtnTextPremium: { fontSize: 16, fontWeight: '700' },

  eventList: { marginBottom: 24 },
  eventRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  eventImage: { width: 48, height: 48, borderRadius: 10, marginRight: 14 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  eventSub: { fontSize: 13 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioCircleSelected: {},
  radioInner: { width: 12, height: 12, borderRadius: 6 },

  planNameInput: { borderRadius: 14, paddingHorizontal: 18, height: 54, fontSize: 15, marginBottom: 24, borderWidth: 1 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  closeBtnCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10 },
  premiumInput: { borderRadius: 14, height: 56, paddingHorizontal: 16, fontSize: 15 },
  rowGroup: { flexDirection: 'row', marginBottom: 20 },
  iconInput: { borderRadius: 14, height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconInputText: { fontSize: 15 },

  /* Map Modal Styles */
  mapContainer: { flex: 1, paddingTop: Platform.OS === 'android' ? 70 : 0 },
  mapSearchWrapper: { paddingHorizontal: 20, marginTop: 20 },
  mapSearchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, height: 56, borderWidth: 1 },
  mapSearchText: { fontSize: 15 },
  pinContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pinWrapper: { alignItems: 'center', marginBottom: 40 },
  pinCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.4)' },
  pinDot: { width: 8, height: 8, borderRadius: 4 },
  pinLine: { width: 2, height: 24 },
  mapFooter: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 30, gap: 15 },

  browseEventsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    width: '100%',
  },
  browseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  browseText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});
