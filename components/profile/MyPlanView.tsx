import EventPickerModal from '@/components/post/EventPickerModal';
import { Feather } from '@expo/vector-icons';
import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
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
  Animated,
  Dimensions,
  Image, Modal, Platform,
  Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from '@/hooks/useTheme';

/* ─── Constants ─── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_HDR = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

/* ─── Types ─── */
type PlanEvent = { id: string; day: number; time: string; title: string; image: string; venue?: string };

/* ─── Time slots for the timeline ─── */
const TIME_SLOTS = ['6:00 PM', '9:00 PM'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MyPlanView() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ planName?: string; planDate?: string; planTime?: string; planEvent?: string; planFriends?: string }>();

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [events, setEvents] = useState<PlanEvent[]>([
    {
      id: '1', day: selectedDay, time: '6:00 PM',
      title: 'Dinner', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
      venue: 'Rooftop Series Vol.4',
    },
    {
      id: '2', day: selectedDay, time: '9:00 PM',
      title: 'Party', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=200&auto=format&fit=crop',
      venue: 'Rooftop Series Vol.4',
    }
  ]);

  const handleAddEvent = () => {
    setEvents([
      ...events,
      {
        id: Math.random().toString(), day: selectedDay, time: '6:00 PM',
        title: planName || 'Dinner', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
        venue: planLocation || 'Rooftop Series Vol.4',
      }
    ]);
    setIsCreatePlanModalVisible(false);
  };

  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [isCreatePlanModalVisible, setIsCreatePlanModalVisible] = useState(false);
  const [isSelectEventModalVisible, setIsSelectEventModalVisible] = useState(false);

  const [planName, setPlanName] = useState('');
  const [planDate, setPlanDate] = useState('Sep 9, 2026');
  const [planTime, setPlanTime] = useState('10:00 AM');
  const [selectedEventRadio, setSelectedEventRadio] = useState<string | null>(null);
  const [planLocation, setPlanLocation] = useState('123, Main Street NYC');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [centeredEventId, setCenteredEventId] = useState<string | null>(null);

  const highlightedDays = useMemo(() => new Set([4, 5]), []);
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
  }, [calYear, calMonth, daysInMonth, firstDay]);

  const dayEvents = useMemo(() => events.filter(e => e.day === selectedDay), [events, selectedDay]);

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
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={s.timelineContainer}>
          <View style={[s.timelineVerticalLine, { backgroundColor: colors.border }]} />
          {TIME_SLOTS.map((slot) => {
            const ev = dayEvents.find(e => e.time === slot);
            return (
              <TimelineSlot
                key={slot}
                slot={slot}
                ev={ev}
                isCentered={centeredEventId === ev?.id}
                onToggleCenter={() => setCenteredEventId(centeredEventId === ev?.id ? null : (ev?.id || null))}
                onAddPress={() => setIsCreatePlanModalVisible(true)}
                colors={colors}
              />
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={isMoreMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMoreMenuVisible(false)}>
        <TouchableOpacity style={s.moreOverlay} activeOpacity={1} onPress={() => setIsMoreMenuVisible(false)}>
          <View style={[s.moreMenuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                    setIsCreatePlanModalVisible(true);
                  } else if (item.route) {
                    router.push(item.route as any);
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

      <Modal visible={isMapModalVisible} transparent animationType="slide" onRequestClose={() => setIsMapModalVisible(false)}>
        <View style={[s.mapContainer, { backgroundColor: colors.background }]}>
          <Image
            source={isDark ? require('../../assets/images/dark-map.png') : require('../../assets/images/map_bg.png')}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <SafeAreaView style={{ flex: 1 }}>
            <View style={[s.modalHeader, { paddingHorizontal: 20 }]}>
              <TouchableOpacity onPress={() => setIsMapModalVisible(false)} style={[s.closeBtnCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="chevron-left" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.text }]}>Map</Text>
              <View style={{ width: 36 }} />
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
        onSelect={(title) => {
          setSelectedEventRadio(title);
          setIsSelectEventModalVisible(false);
        }}
      />
    </View>
  );
}

function TimelineSlot({ slot, ev, isCentered, onToggleCenter, onAddPress, colors }: any) {
  const router = useRouter();
  const alignAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(alignAnim, {
      toValue: isCentered ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start();
  }, [isCentered]);

  const capsuleTranslateX = alignAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCREEN_WIDTH - 200) / 2 - 50]
  });

  return (
    <View style={s.timeSlotWrap}>
      <Text style={[s.timeLabel, { color: colors.textSecondary }]}>{slot}</Text>
      <View style={[s.dashedLine, { borderColor: colors.border }]} />
      <View style={s.slotContent}>
        {ev ? (
          <View style={{ width: '100%', alignItems: isCentered ? 'center' : 'flex-start' }}>
            <Animated.View style={{ transform: [{ translateX: capsuleTranslateX }] }}>
              <TouchableOpacity style={[s.eventCapsule, { backgroundColor: colors.background, borderColor: colors.border }]} activeOpacity={0.8} onPress={onToggleCenter}>
                <View style={[s.capsuleIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <HugeiconsIcon icon={SpoonAndForkIcon} size={18} color={colors.primary} />
                </View>
                <Text style={[s.capsuleTitle, { color: colors.text }]}>{ev.title}</Text>
                <Text style={[s.capsuleVenue, { color: colors.textSecondary }]}>{ev.venue}</Text>
                <Text style={[s.capsuleTime, { color: colors.textSecondary }]}>{ev.time}</Text>
                <Image source={{ uri: ev.image }} style={s.capsuleImg} />
              </TouchableOpacity>
            </Animated.View>

            {isCentered && (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <View style={[s.nodeConnector, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={[s.wideCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.9} onPress={onToggleCenter}>
                  <View style={s.wideCardTop}>
                    <View style={[s.wideCardIconWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <HugeiconsIcon icon={SpoonAndForkIcon} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.wideCardTitle, { color: colors.text }]}>{ev.title}</Text>
                      <Text style={[s.wideCardVenue, { color: colors.textSecondary }]}>{ev.venue}</Text>
                    </View>
                  </View>
                  <View style={s.wideCardFooter}>
                    <View style={s.footerIcons}>
                      <TouchableOpacity style={s.footerIcon}><HugeiconsIcon icon={Share01Icon} size={18} color={colors.textSecondary} /></TouchableOpacity>
                      <TouchableOpacity style={s.footerIcon}><HugeiconsIcon icon={Delete02Icon} size={18} color={colors.primary} /></TouchableOpacity>
                    </View>
                    <View style={s.footerActions}>
                      <TouchableOpacity style={[s.viewBtnSmall, { backgroundColor: colors.background }]}><Text style={[s.viewBtnTextSmall, { color: colors.text }]}>View</Text></TouchableOpacity>
                      <TouchableOpacity style={[s.addedPillSmall, { backgroundColor: colors.primary }]}><Text style={[s.addedTextSmall, { color: colors.background }]}>Added</Text></TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontWeight: '700', fontSize: 17 },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8, marginTop: 10 },
  monthText: { fontSize: 18, fontWeight: '700' },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 24 },
  dayHeaderText: { fontSize: 15, fontWeight: '600' },
  dayMenuBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingBottom: 100 },
  emptySlotBtn: { width: 90, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  emptySlotBtnText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  timelineContainer: { position: 'relative', marginTop: 0 },
  timelineVerticalLine: { position: 'absolute', left: 24, top: 0, bottom: 0, width: 1 },
  timeSlotWrap: { marginBottom: 32, position: 'relative' },
  timeLabel: { fontSize: 12, marginBottom: 12, marginLeft: 32, fontWeight: '600' },
  dashedLine: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', marginLeft: 24, marginRight: 20, position: 'absolute', top: 6, left: 0, right: 0 },
  slotContent: { paddingLeft: 32, marginTop: 10, paddingRight: 20 },
  eventCapsule: {
    width: 170,
    borderWidth: 1,
    borderRadius: 85,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  capsuleIconWrap: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  capsuleTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  capsuleVenue: { fontSize: 11, textAlign: 'center', marginBottom: 4 },
  capsuleTime: { fontSize: 11, marginBottom: 20 },
  capsuleImg: { width: 90, height: 40, borderRadius: 10, marginBottom: 16 },
  nodeConnector: { width: 1, height: 32 },
  wideCard: { width: SCREEN_WIDTH * 0.85, borderWidth: 1, borderRadius: 60, padding: 24, marginTop: -10 },
  wideCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  wideCardIconWrap: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  wideCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  wideCardVenue: { fontSize: 12 },
  wideCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  footerIcons: { flexDirection: 'row', gap: 16 },
  footerIcon: { padding: 4 },
  footerActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  viewBtnSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  viewBtnTextSmall: { fontSize: 13, fontWeight: '600' },
  addedPillSmall: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  addedTextSmall: { fontSize: 13, fontWeight: '700' },
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
  calDayHl: { },
  moreOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-start', alignItems: 'flex-end' },
  moreMenuContainer: { width: 180, borderRadius: 16, marginTop: 140, marginRight: 20, overflow: 'hidden', borderWidth: 1, elevation: 5 },
  moreMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18 },
  moreMenuIcon: { marginRight: 12 },
  moreMenuText: { fontSize: 14, fontWeight: '400' },
  moreMenuSeparator: { height: 1 },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheetContainer: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  closeBtnCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10 },
  premiumInput: { borderRadius: 14, height: 56, paddingHorizontal: 16, fontSize: 15 },
  rowGroup: { flexDirection: 'row', marginBottom: 20 },
  iconInput: { borderRadius: 14, height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconInputText: { fontSize: 15 },
  bottomSheetActionRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  cancelBtnPremium: { flex: 1, height: 54, borderRadius: 14, backgroundColor: 'transparent', borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cancelBtnTextPremium: { fontSize: 16, fontWeight: '600' },
  addBtnPremium: { flex: 1, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  addBtnTextPremium: { fontSize: 16, fontWeight: '700' },
  mapContainer: { flex: 1, paddingTop: Platform.OS === 'android' ? 70 : 0 },
  pinContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pinWrapper: { alignItems: 'center', marginBottom: 40 },
  pinCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.4)' },
  pinDot: { width: 8, height: 8, borderRadius: 4 },
  pinLine: { width: 2, height: 24 },
  mapFooter: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 30, gap: 15 },
});
