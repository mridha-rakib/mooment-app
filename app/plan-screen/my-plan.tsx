import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image, Modal, Platform, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
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

/* ─── Time slots for the timeline ─── */
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
  const [events, setEvents] = useState<PlanEvent[]>([]);
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
                      {ev ? (
                        <View style={s.capsuleWithWideCardWrap}>
                          {/* Tall Vertical Capsule */}
                          <TouchableOpacity style={s.eventCapsule} activeOpacity={0.8} onPress={() => setPopupEvent(ev)}>
                            <View style={s.capsuleIconWrap}>
                              <Feather name="coffee" size={14} color="#FFF" />
                            </View>
                            <Text style={s.capsuleTitle}>{ev.title}</Text>
                            {ev.venue && <Text style={s.capsuleVenue} numberOfLines={1}>{ev.venue}</Text>}
                            <Text style={s.capsuleTime}>{ev.time}</Text>
                            
                            <Image source={{ uri: ev.image }} style={s.capsuleImg} />
                            
                            <View style={s.capsuleAvatarsRow}>
                              <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' }} style={[s.capsuleAvatar, { marginLeft: 0 }]} />
                              <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' }} style={s.capsuleAvatar} />
                              <Image source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150' }} style={s.capsuleAvatar} />
                              <Text style={s.capsuleMoreText}>+41</Text>
                            </View>
                          </TouchableOpacity>

                          {/* Wide Horizontal Card connected below (only for 6:00 PM slot) */}
                          {slot === '6:00 PM' && (
                            <>
                              <View style={s.nodeConnector} />
                              <View style={s.wideCard}>
                                <View style={s.wideCardTop}>
                                  <View style={[s.capsuleIconWrap, { width: 44, height: 44, borderRadius: 22, marginBottom: 0, marginRight: 14, backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#3A3A4A' }]}>
                                    <Feather name="coffee" size={18} color="#FFF" />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={s.capsuleTitle}>{ev.title}</Text>
                                    <Text style={[s.capsuleVenue, { textAlign: 'left', marginBottom: 8 }]} numberOfLines={1}>
                                      {ev.venue} at 123, Ave NYC
                                    </Text>
                                    <View style={s.capsuleAvatarsRow}>
                                      <Image source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' }} style={[s.capsuleAvatar, { marginLeft: 0 }]} />
                                      <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' }} style={s.capsuleAvatar} />
                                      <Image source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150' }} style={s.capsuleAvatar} />
                                      <Text style={s.capsuleMoreText}>+41  •  {ev.time}</Text>
                                    </View>
                                  </View>
                                </View>
                                <View style={s.wideCardBottom}>
                                  <View style={{ flexDirection: 'row', gap: 16, paddingLeft: 10 }}>
                                    <TouchableOpacity><Feather name="share" size={20} color="#8E8E9B" /></TouchableOpacity>
                                    <TouchableOpacity><Feather name="trash-2" size={20} color="#8E8E9B" /></TouchableOpacity>
                                  </View>
                                  <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity style={s.viewBtn}><Text style={s.viewBtnText}>View</Text></TouchableOpacity>
                                    <TouchableOpacity style={s.addedBtn}>
                                      <Feather name="check" size={14} color="#0e0d12" style={{ marginRight: 4 }} />
                                      <Text style={s.addedBtnText}>Added</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            </>
                          )}
                        </View>
                      ) : (
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
              { label: 'Edit Plan', icon: 'edit-2' },
              { label: 'Add Friend', icon: 'user-plus', route: '/plan-screen/add-friend' },
              { label: 'Tagged Friends', icon: 'users', route: '/plan-screen/tagged-friends' },
              { label: 'Share Plan', icon: 'share', route: '/plan-screen/share-plan' },
              { label: 'Edit Permission', icon: 'edit', route: '/plan-screen/edit-permission' },
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
            <Text style={s.bottomSheetTitle}>Event</Text>
            
            <View style={s.searchContainer}>
              <Feather name="search" size={18} color="#8E8E9B" style={s.searchIcon} />
              <TextInput style={s.searchInput} placeholder="Search event..." placeholderTextColor="#8E8E9B" />
            </View>

            <View style={s.emptyEventBox}>
              <Text style={s.emptyEventText}>Currently you don't have an event, you can browse event</Text>
              <TouchableOpacity style={s.browseBtn} onPress={() => { setIsEventModalVisible(false); setIsSelectEventModalVisible(true); }}>
                <Text style={s.browseBtnText}>Browse Event</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Event Modal 2: Select */}
      <Modal visible={isSelectEventModalVisible} transparent animationType="slide" onRequestClose={() => setIsSelectEventModalVisible(false)}>
        <Pressable style={s.bottomSheetOverlay} onPress={() => setIsSelectEventModalVisible(false)}>
          <Pressable style={s.bottomSheetContainer} onPress={(e) => e.stopPropagation()}>
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

            <View style={s.bottomSheetBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setIsSelectEventModalVisible(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addModalBtn} onPress={() => setIsSelectEventModalVisible(false)}>
                <Text style={s.addModalBtnText}>Add</Text>
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

            <View style={s.bottomSheetBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setIsNamePlanModalVisible(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.addModalBtn} onPress={() => setIsNamePlanModalVisible(false)}>
                <Text style={s.addModalBtnText}>Done</Text>
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
  circleNode: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#13131A', borderWidth: 1, borderColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center' },
  nodeConnector: { width: 1, height: 32, backgroundColor: '#2A2A3A', marginLeft: 74 },
  wideCard: { width: '100%', backgroundColor: '#13131A', borderWidth: 1, borderColor: '#2A2A3A', borderRadius: 40, padding: 20 },
  wideCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  wideCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewBtn: { backgroundColor: '#1A1A2E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  viewBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  addedBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C2B5CD', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  addedBtnText: { color: '#0e0d12', fontSize: 13, fontWeight: 'bold' },

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
  moreOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  moreMenuContainer: { width: 180, backgroundColor: '#45454A', borderRadius: 8, marginTop: 150, marginRight: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#55555A', paddingBottom: 4 },
  moreMenuHeader: { color: '#8E8E9B', fontSize: 13, fontWeight: '600', padding: 12, paddingBottom: 8 },
  moreMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  moreMenuIcon: { marginRight: 12 },
  moreMenuText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  moreMenuSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  /* Add Event Button */
  addEventBtn: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#13131A', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A3A', minWidth: 80 },
  addEventBtnText: { color: '#FFF', fontSize: 11, fontWeight: '500' },

  /* Bottom Sheets */
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#13131A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  bottomSheetTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 24, paddingHorizontal: 16, height: 48, marginBottom: 20 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  
  emptyEventBox: { alignItems: 'center', marginVertical: 20 },
  emptyEventText: { color: '#8E8E9B', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  browseBtn: { backgroundColor: '#C2B5CD', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  browseBtnText: { color: '#0e0d12', fontSize: 14, fontWeight: 'bold' },

  eventList: { marginBottom: 20 },
  eventRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  eventImage: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  eventSub: { color: '#8E8E9B', fontSize: 12 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#8E8E9B', justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },

  bottomSheetBtns: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  addModalBtn: { flex: 1, backgroundColor: '#C2B5CD', alignItems: 'center', paddingVertical: 12, borderRadius: 24 },
  addModalBtnText: { color: '#0e0d12', fontSize: 14, fontWeight: 'bold' },

  planNameInput: { backgroundColor: '#1A1A2E', borderRadius: 12, paddingHorizontal: 16, height: 48, color: '#FFF', fontSize: 14, marginBottom: 20 },
});
