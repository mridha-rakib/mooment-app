import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image, Modal, Platform, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

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
  const [events, setEvents] = useState<PlanEvent[]>([]);

  const handleAddEvent = () => {
    // Populate with dummy events matching the design
    setEvents([
      {
        id: '1', day: selectedDay, time: '6:00 PM',
        title: 'Dinner', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
        venue: 'Rooftop Series Vol.4',
      },
      {
        id: '2', day: selectedDay, time: '9:00 PM',
        title: 'Dinner', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
        venue: 'Rooftop Series Vol.4',
      }
    ]);
    setIsSelectEventModalVisible(false);
    setIsNamePlanModalVisible(true); // Open the Name Plan modal after adding
  };
  const [popupEvent, setPopupEvent] = useState<PlanEvent | null>(null);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [isSelectEventModalVisible, setIsSelectEventModalVisible] = useState(false);
  const [isNamePlanModalVisible, setIsNamePlanModalVisible] = useState(false);
  const [selectedEventRadio, setSelectedEventRadio] = useState<string | null>(null);

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

  const hasAnyEvents = true; // Force true to always show timeline

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

        {/* ═══ Calendar ═══ */}
        {calendarOpen && (
          <View style={{ marginBottom: 24, marginTop: 12 }}>
            <View style={s.calendarHeaderWrap}>
              <Text style={s.bigDay}>Mon, Aug 17</Text>
              <View style={s.calendarLine} />
            </View>

            <View style={s.calNav}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={s.calNavLabel}>August 2025</Text>
                <Feather name="chevron-down" size={12} color="#8E8E9B" style={{ marginLeft: 4 }} />
              </View>
              <View style={s.calNavArrows}>
                <TouchableOpacity onPress={prevMonth} style={s.calArrow} activeOpacity={0.7}><Feather name="chevron-left" size={14} color="#FFF" /></TouchableOpacity>
                <TouchableOpacity onPress={nextMonth} style={s.calArrow} activeOpacity={0.7}><Feather name="chevron-right" size={14} color="#FFF" /></TouchableOpacity>
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
          </View>
        )}

        {/* ═══ Timeline or Empty State ═══ */}
        {hasAnyEvents ? (
          <View>
            {calendarOpen && <Text style={s.yourPlanLabel}>Your Plan</Text>}

            <View style={s.dayHeaderRow}>
              <Text style={s.dayHeaderText}>{dayLabel}</Text>
              <TouchableOpacity style={s.dayMenuBtn} activeOpacity={0.7} onPress={() => setIsMoreMenuVisible(true)}>
                <Feather name="more-horizontal" size={16} color="#8E8E9B" />
              </TouchableOpacity>
            </View>

            {/* Vertical Timeline */}
            <View style={s.timelineContainer}>
              <View style={s.timelineVerticalLine} />

              {TIME_SLOTS.map((slot) => {
                const ev = dayEvents.find(e => e.time === slot);
                return (
                  <View key={slot} style={s.timeSlotWrap}>
                    <Text style={s.timeLabel}>{slot}</Text>
                    <View style={s.dashedLine} />

                    <View style={s.slotContent}>
                      {ev ? (() => {
                        const validEv = ev;
                        return (
                          <>
                            {/* Slot 1: Tall Vertical Capsule + Wide Card Connected (6:00 PM) */}
                            {slot === '6:00 PM' && (
                              <View style={{ alignItems: 'center', width: '100%' }}>
                                <TouchableOpacity style={s.eventCapsule} activeOpacity={0.8} onPress={() => setPopupEvent(validEv)}>
                                  <View style={s.capsuleIconWrap}>
                                    <Feather name="music" size={14} color="#FFF" />
                                  </View>
                                  <Text style={s.capsuleTitle}>{validEv.title}</Text>
                                  {validEv.venue && <Text style={s.capsuleVenue} numberOfLines={1}>{validEv.venue}</Text>}
                                  <Text style={s.capsuleTime}>{validEv.time}</Text>
                                  <Image source={{ uri: validEv.image }} style={s.capsuleImg} />
                                  <View style={s.capsuleAvatarsRow}>
                                    <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' }} style={[s.capsuleAvatar, { marginLeft: 0 }]} />
                                    <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' }} style={s.capsuleAvatar} />
                                    <Image source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150' }} style={s.capsuleAvatar} />
                                    <Text style={s.capsuleMoreText}>+41</Text>
                                  </View>
                                </TouchableOpacity>

                                <View style={s.nodeConnector} />

                                <TouchableOpacity style={s.wideCard} activeOpacity={0.9} onPress={() => setIsMoreMenuVisible(true)}>
                                  <View style={s.wideCardLeft}>
                                    <View style={s.wideCardIcon}>
                                      <Feather name="music" size={18} color="#FFF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={s.wideCardTitle}>{validEv.title}</Text>
                                      <Text style={[s.wideCardTime, { marginBottom: 6, fontSize: 10 }]} numberOfLines={1}>
                                        {validEv.venue} at 123, Ave NYC
                                      </Text>
                                      <View style={s.capsuleAvatarsRow}>
                                        <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' }} style={[s.capsuleAvatar, { marginLeft: 0, width: 16, height: 16 }]} />
                                        <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' }} style={[s.capsuleAvatar, { width: 16, height: 16 }]} />
                                        <Image source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150' }} style={[s.capsuleAvatar, { width: 16, height: 16 }]} />
                                        <Text style={[s.capsuleMoreText, { fontSize: 9 }]}>+41  •  {validEv.time}</Text>
                                      </View>
                                    </View>
                                  </View>
                                  <View style={s.wideCardActions}>
                                    <TouchableOpacity style={s.actionIcon} onPress={() => setIsMoreMenuVisible(true)}><Feather name="share" size={16} color="#8E8E9B" /></TouchableOpacity>
                                    <TouchableOpacity style={s.actionIcon} onPress={() => setIsMoreMenuVisible(true)}><Feather name="trash-2" size={16} color="#8E8E9B" /></TouchableOpacity>
                                    <TouchableOpacity style={s.viewActionBtn}><Text style={s.viewActionText}>View</Text></TouchableOpacity>
                                    <TouchableOpacity style={s.addedActionBtn}>
                                      <Feather name="check" size={12} color="#0e0d12" />
                                      <Text style={s.addedActionText}>Added</Text>
                                    </TouchableOpacity>
                                  </View>
                                </TouchableOpacity>
                              </View>
                            )}

                            {/* Slot 2: Standalone Tall Vertical Capsule (9:00 PM) */}
                            {slot === '9:00 PM' && (
                              <TouchableOpacity style={s.eventCapsule} activeOpacity={0.8} onPress={() => setPopupEvent(validEv)}>
                                <View style={s.capsuleIconWrap}>
                                  <Feather name="music" size={14} color="#FFF" />
                                </View>
                                <Text style={s.capsuleTitle}>{validEv.title}</Text>
                                {validEv.venue && <Text style={s.capsuleVenue} numberOfLines={1}>{validEv.venue}</Text>}
                                <Text style={s.capsuleTime}>{validEv.time}</Text>
                                <Image source={{ uri: validEv.image }} style={s.capsuleImg} />
                                <View style={s.capsuleAvatarsRow}>
                                  <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' }} style={[s.capsuleAvatar, { marginLeft: 0 }]} />
                                  <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' }} style={s.capsuleAvatar} />
                                  <Image source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150' }} style={s.capsuleAvatar} />
                                  <Text style={s.capsuleMoreText}>+41</Text>
                                </View>
                              </TouchableOpacity>
                            )}
                          </>
                        );
                      })() : (
                        <View style={s.capsuleWithWideCardWrap}>
                          <TouchableOpacity style={s.addEventBtn} onPress={() => setIsEventModalVisible(true)}>
                            <Feather name="plus" size={14} color="#FFF" style={{ marginBottom: 4 }} />
                            <Text style={s.addEventBtnText}>Add Event</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}><Feather name="star" size={24} color="#8E8E9B" /></View>
            <Text style={s.emptyTitle}>No Activity yet</Text>
            <Text style={s.emptyDesc}>Make plan with your friends, and family. Search events that are currently going on map</Text>
            <TouchableOpacity style={s.discoverBtn} activeOpacity={0.8} onPress={() => router.push('/discover-screen/search' as any)}>
              <Text style={s.discoverText}>Go discover something</Text>
            </TouchableOpacity>
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

      {/* More Options Menu */}
      <Modal visible={isMoreMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMoreMenuVisible(false)}>
        <TouchableOpacity style={s.moreOverlay} activeOpacity={1} onPress={() => setIsMoreMenuVisible(false)}>
          <View style={s.moreMenuContainer}>
            <Text style={s.moreMenuHeader}>more</Text>
            {[
              { label: 'Create Plan', icon: 'calendar', isCreate: true },
              { label: 'Edit Plan', icon: 'edit' },
              { label: 'Add Friend', icon: 'user-plus', route: '/plan-screen/add-friend' },
              { label: 'Tagged Friends', icon: 'users', route: '/plan-screen/tagged-friends' },
              { label: 'Share Plan', icon: 'share', route: '/plan-screen/share-plan' },
              { label: 'Edit Permission', icon: 'edit-3', route: '/plan-screen/edit-permission' },
              { label: 'Delete', icon: 'trash-2' },
            ].map((item, idx) => (
              <View key={item.label}>
                {idx > 0 && <View style={s.moreMenuSeparator} />}
                <TouchableOpacity style={s.moreMenuItem} activeOpacity={0.8} onPress={() => {
                  setIsMoreMenuVisible(false);
                  if (item.isCreate) {
                    setIsNamePlanModalVisible(true);
                  } else if (item.route) {
                    router.push(item.route as any);
                  }
                }}>
                  <Feather name={item.icon as any} size={16} color="#FFFFFF" style={s.moreMenuIcon} />
                  <Text style={s.moreMenuText}>{item.label}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Event Modal 1: Browse */}
      <Modal visible={isEventModalVisible} transparent animationType="slide" onRequestClose={() => setIsEventModalVisible(false)}>
        <Pressable style={s.bottomSheetOverlay} onPress={() => setIsEventModalVisible(false)}>
          <Pressable style={s.bottomSheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={s.dragHandle} />
            <Text style={s.bottomSheetTitle}>Event</Text>

            <View style={s.searchContainerPremium}>
              <Feather name="search" size={18} color="#8E8E9B" style={s.searchIcon} />
              <TextInput style={s.searchInput} placeholder="Search event..." placeholderTextColor="#8E8E9B" />
            </View>

            <View style={s.emptyEventBox}>
              <Text style={s.emptyEventTextLarge}>Currently you don't have an event, you can browse event</Text>
              <TouchableOpacity style={s.browseBtnLarge} onPress={() => { setIsEventModalVisible(false); setIsSelectEventModalVisible(true); }}>
                <Text style={s.browseBtnTextLarge}>Browse Event</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Event Modal 2: Select */}
      <Modal visible={isSelectEventModalVisible} transparent animationType="slide" onRequestClose={() => setIsSelectEventModalVisible(false)}>
        <Pressable style={s.bottomSheetOverlay} onPress={() => setIsSelectEventModalVisible(false)}>
          <Pressable style={s.bottomSheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={s.dragHandle} />
            <Text style={s.bottomSheetTitle}>Select event to add</Text>

            <View style={s.eventList}>
              {[
                { id: 'e1', title: 'DJ Party Music', time: '18:00', price: '$45.00', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150' },
                { id: 'e2', title: 'Rooftop Session Vol.4', time: '20:00', price: '$45.00', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150' },
                { id: 'e3', title: 'Rooftop Session Vol.4', time: '21:00', price: '$45.00', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150' },
              ].map(item => (
                <TouchableOpacity key={item.id} style={s.eventRow} onPress={() => setSelectedEventRadio(item.id)}>
                  <Image source={{ uri: item.image }} style={s.eventImage} />
                  <View style={s.eventInfo}>
                    <Text style={s.eventTitle}>{item.title}</Text>
                    <Text style={s.eventSub}>{item.time}  •  {item.price}</Text>
                  </View>
                  <View style={s.radioCircle}>
                    {selectedEventRadio === item.id && <View style={s.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.bottomSheetActionRow}>
              <TouchableOpacity style={s.cancelBtnPremium} onPress={() => setIsSelectEventModalVisible(false)}>
                <Text style={s.cancelBtnTextPremium}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addBtnPremium} onPress={handleAddEvent}>
                <Text style={s.addBtnTextPremium}>Add</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Plan Modal: Name Plan */}
      <Modal visible={isNamePlanModalVisible} transparent animationType="slide" onRequestClose={() => setIsNamePlanModalVisible(false)}>
        <Pressable style={s.bottomSheetOverlay} onPress={() => setIsNamePlanModalVisible(false)}>
          <Pressable style={s.bottomSheetContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={s.bottomSheetTitle}>Name your Plan</Text>

            <TextInput
              style={s.planNameInput}
              placeholder="Plan Name"
              placeholderTextColor="#8E8E9B"
            />

            <View style={s.bottomSheetActionRow}>
              <TouchableOpacity style={[s.cancelBtnPremium, { borderWidth: 0 }]} onPress={() => setIsNamePlanModalVisible(false)}>
                <Text style={[s.cancelBtnTextPremium, { fontWeight: '700' }]}>Canel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addBtnPremium} onPress={() => { setIsNamePlanModalVisible(false); router.push('/plan-screen/add-friend' as any); }}>
                <Text style={s.addBtnTextPremium}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
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

  /* Empty state */
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: 32 },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptyDesc: { color: '#8E8E9B', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  discoverBtn: { backgroundColor: '#C2B5CD', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  discoverText: { color: '#0e0d12', fontSize: 14, fontWeight: 'bold' },

  /* Timeline */
  yourPlanLabel: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  dayHeaderText: { color: '#8E8E9B', fontSize: 12 },
  dayMenuBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },

  timelineContainer: { position: 'relative', marginTop: 10 },
  timelineVerticalLine: { position: 'absolute', left: 24, top: 0, bottom: 0, width: 1, backgroundColor: '#2A2A3A' },

  timeSlotWrap: { marginBottom: 60, position: 'relative' },
  timeLabel: { color: '#8E8E9B', fontSize: 10, marginBottom: 6, marginLeft: 32 },
  dashedLine: { height: 1, borderTopWidth: 1, borderColor: '#2A2A3A', borderStyle: 'dashed', marginLeft: 24 },

  slotContent: { paddingLeft: 32, marginTop: 40, paddingRight: 10 },

  /* Vertical Capsule Card */
  capsuleWithWideCardWrap: { alignItems: 'flex-start', width: '100%' },
  eventCapsule: {
    width: 150,
    backgroundColor: '#13131A',
    borderWidth: 1, borderColor: '#2A2A3A',
    borderRadius: 75,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  capsuleIconWrap: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  capsuleTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  capsuleVenue: { color: '#8E8E9B', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  capsuleTime: { color: '#8E8E9B', fontSize: 11, marginBottom: 12 },
  capsuleImg: { width: 80, height: 40, borderRadius: 8, marginBottom: 12 },
  capsuleAvatarsRow: { flexDirection: 'row', alignItems: 'center' },
  capsuleAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#0e0d12', marginLeft: -8 },
  capsuleMoreText: { color: '#8E8E9B', fontSize: 10, marginLeft: 6 },

  /* Node + Wide Card */
  circleNode: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#13131A', borderWidth: 1, borderColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center' },
  nodeConnector: { width: 1, height: 20, backgroundColor: '#2A2A3A' },
  wideCard: { width: '100%', backgroundColor: '#13131A', borderWidth: 1, borderColor: '#2A2A3A', borderRadius: 50, padding: 12, paddingHorizontal: 16, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' },
  wideCardLeft: { flexDirection: 'row', alignItems: 'center' },
  wideCardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2A2A3A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  wideCardTitle: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  wideCardTime: { color: '#8E8E9B', fontSize: 11 },
  wideCardActions: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  actionIcon: { padding: 4 },
  viewActionBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  viewActionText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  addedActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C2B5CD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  addedActionText: { color: '#0e0d12', fontSize: 12, fontWeight: '700' },

  /* Calendar */
  calendarHeaderWrap: { marginBottom: 20 },
  bigDay: { color: '#FFF', fontSize: 28, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  calendarLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%' },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 4 },
  calNavLabel: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  calNavArrows: { flexDirection: 'row', gap: 16 },
  calArrow: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  calHdrRow: { flexDirection: 'row', marginBottom: 16 },
  calHdr: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 12, fontWeight: '600' },
  calWeek: { flexDirection: 'row', marginBottom: 8 },
  calCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  calCellSel: { backgroundColor: '#45454A', borderRadius: 20, width: 40, height: 40 },
  calCellHl: { borderRadius: 20, width: 40, height: 40, borderWidth: 1, borderColor: '#8E54E9' },
  calDay: { color: '#FFF', fontSize: 14 },
  calDaySel: { color: '#FFF', fontWeight: '700' },
  calDayHl: { color: '#FFF' },

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

  /* More Menu */
  moreOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-start', alignItems: 'flex-end' },
  moreMenuContainer: { width: 170, backgroundColor: '#45454A', borderRadius: 12, marginTop: 140, marginRight: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moreMenuHeader: { display: 'none' },
  moreMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  moreMenuIcon: { marginRight: 10 },
  moreMenuText: { color: '#FFFFFF', fontSize: 13, fontWeight: '400' },
  moreMenuSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  /* Add Event Button */
  addEventBtn: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#13131A', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A3A', minWidth: 80 },
  addEventBtnText: { color: '#FFF', fontSize: 11, fontWeight: '500' },

  /* Bottom Sheets */
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#13131A', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(252, 252, 252, 1)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  bottomSheetTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 24, textAlign: 'center' },

  searchContainerPremium: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderRadius: 12, paddingHorizontal: 16, height: 50, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },

  emptyEventBox: { alignItems: 'center', marginVertical: 30 },
  emptyEventTextLarge: { color: '#8E8E9B', fontSize: 14, textAlign: 'center', marginBottom: 30, paddingHorizontal: 20, lineHeight: 20 },
  browseBtnLarge: { backgroundColor: '#C2B5CD', width: '100%', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  browseBtnTextLarge: { color: '#0e0d12', fontSize: 16, fontWeight: '700' },

  bottomSheetActionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtnPremium: { flex: 1, height: 52, borderRadius: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  cancelBtnTextPremium: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  addBtnPremium: { flex: 1, height: 52, borderRadius: 12, backgroundColor: '#C2B5CD', justifyContent: 'center', alignItems: 'center' },
  addBtnTextPremium: { color: '#0e0d12', fontSize: 16, fontWeight: '700' },

  eventList: { marginBottom: 20 },
  eventRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  eventImage: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventTitle: { color: '#FFF', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  eventSub: { color: '#8E8E9B', fontSize: 12 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#C2B5CD' },

  planNameInput: { backgroundColor: '#1A1A2E', borderRadius: 12, paddingHorizontal: 16, height: 48, color: '#FFF', fontSize: 14, marginBottom: 20 },
});
