import BackButton from "@/components/ui/BackButton";
import { Feather } from "@expo/vector-icons";
import { Calendar01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { requireBusinessAccountForEvent } from "@/lib/eventGuard";
import { useAuthStore } from "@/stores/authStore";

export default function CreatorDashboardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Creator Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() =>
              requireBusinessAccountForEvent({
                user,
                completedProfileTypes,
                updateProfile,
                router,
                onReady: () => router.push("/create-event"),
              })
            }
          >
            <HugeiconsIcon icon={Calendar01Icon} size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Create Event</Text>
          </TouchableOpacity>
          {/* Add Product button is temporarily removed */}
          {/* 
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <HugeiconsIcon icon={ShoppingBag01Icon} size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Add Product</Text>
          </TouchableOpacity>
          */}
        </View>

        {/* Main Balance */}
        <View style={styles.balanceSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Available Balance For this Month</Text>
          <Text style={[styles.mainBalance, { color: colors.text }]}>$ 55.00</Text>

          <View style={styles.balanceSplit}>
            <View style={styles.balanceColumn}>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Available Mooment Credit{'\n'}Balance</Text>
              <Text style={[styles.subBalance, { color: colors.text }]}>MCB 55.00</Text>
            </View>
            <Feather name="arrow-right" size={16} color={colors.textSecondary} style={styles.arrowIcon} />
            <View style={styles.balanceColumn}>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Available Mooment{'\n'}Balance</Text>
              <Text style={[styles.subBalance, { color: colors.text }]}>$ 55.00</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterPill, { backgroundColor: isDark ? colors.card : '#EBEBEB' }]}>
            <Text style={[styles.filterText, { color: isDark ? colors.text : '#0e0d12' }]}>Weekly</Text>
            <Feather name="chevron-down" size={14} color={isDark ? colors.textSecondary : '#8E8E9B'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterPill, { backgroundColor: isDark ? colors.card : '#EBEBEB' }]}>
            <Text style={[styles.filterText, { color: isDark ? colors.text : '#0e0d12' }]}>Month</Text>
            <Feather name="chevron-down" size={14} color={isDark ? colors.textSecondary : '#8E8E9B'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterPill, { backgroundColor: isDark ? colors.card : '#EBEBEB' }]}>
            <Text style={[styles.filterText, { color: isDark ? colors.text : '#0e0d12' }]}>Year</Text>
            <Feather name="chevron-down" size={14} color={isDark ? colors.textSecondary : '#8E8E9B'} />
          </TouchableOpacity>
        </View>

        {/* Earnings */}
        <View style={styles.earningsSection}>
          <View style={styles.earningItem}>
            <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>All Earnings</Text>
            <Text style={[styles.earningAmount, { color: colors.text }]}>$ 11000.00</Text>
          </View>
          <View style={styles.earningItem}>
            <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>All Earnings</Text>
            <Text style={[styles.earningAmount, { color: colors.text }]}>MCB 55.00</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statColumn}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ticket Sold</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>200</Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Product Sold</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>200</Text>
          </View>
        </View>

        {/* All Events List */}
        <View style={styles.eventsSection}>
          <Text style={[styles.eventsTitle, { color: colors.text }]}>All Events</Text>

          {[1, 2, 3].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/profile-screen/event-dashboard')}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200' }}
                style={styles.eventImage}
              />
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: colors.text }]}>Rooftop Session Vol.4</Text>
                <Text style={[styles.eventDetails, { color: colors.textSecondary }]}>Sat, Sep 9  •  9:00  •  <Feather name="lock" size={10} color={colors.textSecondary} /></Text>

                <View style={styles.eventBottom}>
                  <View style={styles.avatarsRow}>
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} style={[styles.tinyAvatar, { borderColor: colors.card }]} />
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }} style={[styles.tinyAvatar, { marginLeft: -8, borderColor: colors.card }]} />
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100' }} style={[styles.tinyAvatar, { marginLeft: -8, borderColor: colors.card }]} />
                  </View>
                  <Text style={[styles.goingText, { color: colors.text }]}>41 going  •  {index === 2 ? '88 tickets left' : 'Sold Out'}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textSecondary} style={styles.eventChevron} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Section */}
        <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Total Sales</Text>
            <TouchableOpacity style={styles.chartFilter}>
              <Text style={[styles.chartFilterText, { color: colors.textSecondary }]}>Year</Text>
              <Feather name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.chartArea}>
            {/* Y Axis */}
            <View style={styles.yAxis}>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$1k</Text>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$750</Text>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$500</Text>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$250</Text>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$0</Text>
            </View>

            {/* Bars */}
            <View style={styles.barsContainer}>
              <View style={styles.gridLines}>
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
              </View>

              <View style={styles.barsRow}>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '60%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Jan</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '80%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Feb</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '50%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Mar</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '70%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Apr</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '90%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>May</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '85%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Jun</Text></View>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceSection: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  mainBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  balanceSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceColumn: {
    flex: 1,
  },
  subLabel: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  subBalance: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrowIcon: {
    marginHorizontal: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  earningsSection: {
    marginBottom: 30,
    gap: 20,
  },
  earningItem: {},
  earningLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  earningAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  statColumn: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  eventsSection: {
    marginBottom: 30,
  },
  eventsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  eventImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 10,
    marginBottom: 6,
  },
  eventBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    marginRight: 8,
  },
  tinyAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  goingText: {
    fontSize: 10,
  },
  eventChevron: {
    marginLeft: 10,
  },
  chartSection: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartFilterText: {
    fontSize: 12,
  },
  chartArea: {
    flexDirection: 'row',
    height: 200,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 15,
    paddingBottom: 20, // space for x labels
  },
  axisLabel: {
    fontSize: 10,
  },
  barsContainer: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingBottom: 20, // keep grid lines aligned with y-axis
  },
  gridLine: {
    height: 1,
    width: '100%',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  barWrapper: {
    alignItems: 'center',
    width: 24,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 8,
    borderRadius: 4,
    marginBottom: 10, // space above label
  },
  xLabel: {
    fontSize: 10,
  },
});
