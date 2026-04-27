import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image, Modal, Platform, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

/* ─── Constants ─── */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_HDR = ['S','M','T','W','T','F','S'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

/* ─── Types ─── */
type PlanEvent = { id: string; day: number; time: string; title: string; image: string; venue?: string };

/* ─── Time slots for the empty timeline ─── */
const TIME_SLOTS = ['6:00 PM', '7:00 PM'];

export default function MyPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planName?: string; planDate?: string; planTime?: string; planEvent?: string; planFriends?: string }>();

  // Determine if a plan was just created
  const hasPlan = !!(params.planName && params.planName.trim());

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [events, setEvents] = useState<PlanEvent[]>(() => {
    if (hasPlan) {
      return [{
        id: '1', day: selectedDay, time: params.planTime || '6:00 PM',
        title: params.planName!, image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
        venue: params.planEvent || undefined,
      }];
    }
    return [];
  });
  const [popupEvent, setPopupEvent] = useState<PlanEvent | null>(null);

  const highlightedDays = useMemo(() => new Set([4, 5]), []);
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDay(calYear, calMonth);

  const selectedDate = new Date(calYear, calMonth, selectedDay);
  const fullDayLabel = `${DAY_NAMES[selectedDate.getDay()]}, ${SHORT_MONTHS[calMonth]} ${selectedDay}`;
  const dayLabel = `${DAY_NAMES[selectedDate.getDay()]}, ${selectedDay}`;

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

  const addEvent = () => {
    setCalendarOpen(true);
  };

  const hasAnyEvents = events.length > 0;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Plan</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Month toggle */}
      <TouchableOpacity style={s.monthRow} activeOpacity={0.7} onPress={() => setCalendarOpen(!calendarOpen)}>
        <Text style={s.monthText}>{MONTHS[calMonth]}</Text>
        <Feather name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#8E8E9B" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ═══ NO PLAN: Empty State ═══ */}
        {!hasAnyEvents && !calendarOpen && (
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}><Feather name="star" size={28} color="#8E8E9B" /></View>
            <Text style={s.emptyTitle}>No Activity yet</Text>
            <Text style={s.emptyDesc}>Make plan with your friends, and family. Search events that are currently going on map</Text>
            <TouchableOpacity style={s.discoverBtn} activeOpacity={0.8} onPress={() => router.push('/discover-screen/search' as any)}>
              <Text style={s.discoverText}>Go discover something</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ HAS PLAN: Timeline View (collapsed calendar) ═══ */}
        {hasAnyEvents && !calendarOpen && (
          <View>
            {/* Day header */}
            <View style={s.dayHeaderRow}>
              <Text style={s.dayHeaderText}>{dayLabel}</Text>
              <TouchableOpacity style={s.dayMenuBtn} activeOpacity={0.7}>
                <Feather name="more-horizontal" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Timeline with events + empty slots */}
            {TIME_SLOTS.map((slot) => {
              const ev = dayEvents.find(e => e.time === slot);
              return (
                <View key={slot} style={s.timeSlot}>
                  <Text style={s.timeLabel}>{slot}</Text>
                  <View style={s.dashedLine} />
                  <View style={s.slotContent}>
                    {ev ? (
                      <TouchableOpacity style={s.eventCard} activeOpacity={0.8} onPress={() => setPopupEvent(ev)}>
                        <Image source={{ uri: ev.image }} style={s.eventImg} />
                        <Text style={s.eventTitle} numberOfLines={2}>{ev.title}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={s.addEventBtn} activeOpacity={0.7} onPress={() => addEvent()}>
                        <Feather name="plus" size={18} color="#8E8E9B" />
                        <Text style={s.addEventText}>Add Event</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ Calendar Expanded ═══ */}
        {calendarOpen && (
          <View>
            <Text style={s.bigDay}>{fullDayLabel}</Text>

            <View style={s.calNav}>
              <Text style={s.calNavLabel}>{MONTHS[calMonth]} {calYear}</Text>
              <View style={s.calNavArrows}>
                <TouchableOpacity onPress={prevMonth} style={s.calArrow} activeOpacity={0.7}><Feather name="chevron-left" size={16} color="#FFF" /></TouchableOpacity>
                <TouchableOpacity onPress={nextMonth} style={s.calArrow} activeOpacity={0.7}><Feather name="chevron-right" size={16} color="#FFF" /></TouchableOpacity>
              </View>
            </View>

            <View style={s.calHdrRow}>{DAYS_HDR.map((d, i) => <Text key={i} style={s.calHdr}>{d}</Text>)}</View>

            {calendarRows.map((row, ri) => (
              <View key={ri} style={s.calWeek}>
                {row.map((day, ci) => {
                  if (!day) return <View key={ci} style={s.calCell} />;
                  const sel = day === selectedDay;
                  const hl = highlightedDays.has(day);
                  return (
                    <TouchableOpacity key={ci} style={[s.calCell, sel && s.calCellSel, hl && !sel && s.calCellHl]} onPress={() => setSelectedDay(day)} activeOpacity={0.7}>
                      <Text style={[s.calDay, sel && s.calDaySel, hl && !sel && s.calDayHl]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Events for selected day or empty state */}
            {dayEvents.length > 0 ? (
              <View style={s.planSection}>
                <Text style={s.yourPlanLabel}>Your Plan</Text>
                {dayEvents.map(ev => (
                  <TouchableOpacity key={ev.id} style={s.eventRow} activeOpacity={0.8} onPress={() => setPopupEvent(ev)}>
                    <Text style={s.eventRowTime}>{ev.time}</Text>
                    <View style={s.eventCard}>
                      <Image source={{ uri: ev.image }} style={s.eventImg} />
                      <Text style={s.eventTitle} numberOfLines={2}>{ev.title}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={s.emptyWrapCal}>
                <View style={s.emptyIcon}><Feather name="star" size={28} color="#8E8E9B" /></View>
                <Text style={s.emptyTitle}>No Activity yet</Text>
                <Text style={s.emptyDesc}>Make plan with your friends, and family. Search events that are currently going on map</Text>
                <TouchableOpacity style={s.discoverBtn} activeOpacity={0.8} onPress={() => router.push('/discover-screen/search' as any)}>
                  <Text style={s.discoverText}>Go discover something</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Event Detail Popup */}
      <Modal visible={!!popupEvent} transparent animationType="fade" onRequestClose={() => setPopupEvent(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setPopupEvent(null)}>
          <View style={s.popup}>
            {popupEvent && (
              <>
                <Text style={s.popupTitle}>{popupEvent.title}</Text>
                {popupEvent.venue && <Text style={s.popupVenue}>{popupEvent.venue}</Text>}
                <Text style={s.popupTime}>{popupEvent.time}</Text>
                <View style={s.popupBtns}>
                  <TouchableOpacity style={s.popupBtnMore} activeOpacity={0.8} onPress={() => { setPopupEvent(null); router.push('/event-screen/event-details' as any); }}>
                    <Text style={s.popupBtnMoreText}>More</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.popupBtnLeave} activeOpacity={0.8} onPress={() => setPopupEvent(null)}>
                    <Text style={s.popupBtnLeaveText}>Leave</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFF', fontWeight: '700', fontSize: 17, textAlign: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  monthText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 },

  /* Empty state (no plan) */
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: -40 },
  emptyWrapCal: { alignItems: 'center', paddingHorizontal: 32, marginTop: 36 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptyDesc: { color: '#8E8E9B', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  discoverBtn: { borderWidth: 1, borderColor: '#2A2A3A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  discoverText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  /* Timeline (has plan) */
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 4 },
  dayHeaderText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  dayMenuBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },

  timeSlot: { marginBottom: 24 },
  timeLabel: { color: '#8E8E9B', fontSize: 12, marginBottom: 6 },
  dashedLine: { height: 1, borderWidth: 1, borderColor: '#2A2A3A', borderStyle: 'dashed', marginBottom: 20 },
  slotContent: { alignItems: 'center', minHeight: 80, justifyContent: 'center' },
  addEventBtn: { alignItems: 'center', gap: 6 },
  addEventText: { color: '#8E8E9B', fontSize: 13 },

  /* Event card (pill) */
  eventCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A2E', borderRadius: 40,
    paddingVertical: 8, paddingHorizontal: 10, gap: 10,
  },
  eventImg: { width: 44, height: 44, borderRadius: 22 },
  eventTitle: { color: '#FFF', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },

  /* Calendar */
  bigDay: { color: '#FFF', fontSize: 24, fontWeight: '700', marginBottom: 20, marginTop: 4 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calNavLabel: { color: '#8E8E9B', fontSize: 13 },
  calNavArrows: { flexDirection: 'row', gap: 10 },
  calArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  calHdrRow: { flexDirection: 'row', marginBottom: 6 },
  calHdr: { flex: 1, textAlign: 'center', color: '#8E8E9B', fontSize: 13, fontWeight: '600' },
  calWeek: { flexDirection: 'row', marginBottom: 4 },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 19 },
  calCellSel: { backgroundColor: '#16D869' },
  calCellHl: { backgroundColor: 'rgba(142,84,233,0.25)' },
  calDay: { color: '#CCC', fontSize: 14 },
  calDaySel: { color: '#FFF', fontWeight: '700' },
  calDayHl: { color: '#D4B0EB' },

  /* Plan section under calendar */
  planSection: { marginTop: 20 },
  yourPlanLabel: { color: '#8E8E9B', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 },
  eventRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  eventRowTime: { color: '#8E8E9B', fontSize: 11, width: 56 },

  /* Popup */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 80 },
  popup: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, width: '80%', alignItems: 'center' },
  popupTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  popupVenue: { color: '#8E8E9B', fontSize: 12, marginBottom: 4 },
  popupTime: { color: '#8E8E9B', fontSize: 12, marginBottom: 16 },
  popupBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  popupBtnMore: { flex: 1, height: 40, borderRadius: 10, backgroundColor: '#2A2A3A', justifyContent: 'center', alignItems: 'center' },
  popupBtnMoreText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  popupBtnLeave: { flex: 1, height: 40, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  popupBtnLeaveText: { color: '#0e0d12', fontSize: 14, fontWeight: '700' },
});
