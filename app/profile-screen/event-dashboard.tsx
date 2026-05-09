import { Feather } from "@expo/vector-icons";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import React from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import { useTheme } from "@/hooks/useTheme";

import BackButton from "@/components/ui/BackButton";

export default function EventDashboardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Rooftop Session Vol.4</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Earnings Top */}
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Total Earnings</Text>
            <Text style={[styles.largeBalance, { color: colors.text }]}>$ 1100.00</Text>
          </View>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.card }]}>
            <Text style={[styles.shareText, { color: colors.text }]}>Share Event</Text>
            <Feather name="chevron-down" size={14} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* 4-Grid Earnings */}
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Ticket Earnings</Text>
            <Text style={[styles.mediumBalance, { color: colors.text }]}>$ 550.00</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Product Earnings</Text>
            <Text style={[styles.mediumBalance, { color: colors.text }]}>$ 550.00</Text>
          </View>

          <View style={styles.gridItem}>
            <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Ticket Earnings from{'\n'}Mooment Credit</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.smallBalance, { color: colors.text }]}>550.00</Text>
              <Feather name="chevron-up" size={14} color={colors.textSecondary} />
            </View>
          </View>
          <View style={styles.gridItem}>
            <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Ticket Earnings</Text>
            <Text style={[styles.mediumBalance, { color: colors.text }]}>$ 550.00</Text>
          </View>

          <View style={styles.gridItem}>
            <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Product Earnings from{'\n'}Mooment Credit</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.smallBalance, { color: colors.text }]}>550.00</Text>
              <Feather name="chevron-down" size={14} color={colors.textSecondary} />
            </View>
          </View>
          <View style={styles.gridItem}>
            <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>Product Earnings</Text>
            <Text style={[styles.mediumBalance, { color: colors.text }]}>$ 550.00</Text>
          </View>
        </View>

        {/* Status Legend */}
        <View style={styles.legendRow}>
          <View style={styles.avatarsRow}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} style={[styles.tinyAvatar, { borderColor: colors.background }]} />
            <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }} style={[styles.tinyAvatar, { marginLeft: -8, borderColor: colors.background }]} />
          </View>
          <TouchableOpacity
            style={styles.legendItem}
            onPress={() => router.push('/profile-screen/attendee-list')}
          >
            <View style={[styles.dot, { backgroundColor: '#2DB46D' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>47 Ongoing</Text>
          </TouchableOpacity>
          <Text style={[styles.legendDot, { color: colors.textSecondary }]}>•</Text>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#E2B93B' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>41 canceled</Text>
          </View>
          <Text style={[styles.legendDot, { color: colors.textSecondary }]}>•</Text>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#D64646' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>0 canceled</Text>
          </View>
          <Text style={[styles.legendDot, { color: colors.textSecondary }]}>•</Text>
          <View style={styles.legendItem}>
            <Feather name="lock" size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>No show</Text>
          </View>
        </View>

        {/* Sales Stats */}
        <View style={[styles.statsContainer, { borderColor: colors.border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Ticket Sold</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>200</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Product Sold</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>200</Text>
          </View>
        </View>

        {/* Location Info */}
        <View style={[styles.locationContainer, { borderColor: colors.border }]}>
          <View style={styles.locationTop}>
            <Feather name="lock" size={14} color={colors.text} />
            <Text style={[styles.cityText, { color: colors.text }]}>New York City</Text>
          </View>
          <Text style={[styles.locationDetail, { color: colors.text }]}><Text style={[styles.locationDetailLabel, { color: colors.textSecondary }]}>Venue:</Text> The Rooftop Lounge</Text>
          <Text style={[styles.locationDetail, { color: colors.text }]}><Text style={[styles.locationDetailLabel, { color: colors.textSecondary }]}>Address:</Text> 123 Main Street, New York, NY 10001</Text>
        </View>

        {/* Ticket Sales */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ticket Sales</Text>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/profile-screen/ticket-stat')}
          >
            <Text style={[styles.seeAllText, { color: colors.text }]}>See Stat</Text>
            <HugeiconsIcon icon={ArrowRight02Icon} size={14} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Ticket List */}
        <View style={styles.ticketsList}>
          {/* General */}
          <View style={[styles.ticketCard, { borderColor: colors.border }]}>
            <View style={styles.ticketHeader}>
              <Text style={[styles.ticketName, { color: colors.text }]}>General Ticket</Text>
              <View style={styles.ticketPills}>
                <View style={[styles.pillGrey, { backgroundColor: colors.card }]}><Text style={[styles.pillText, { color: colors.text }]}>50/100</Text></View>
                <View style={[styles.pillGrey, { backgroundColor: colors.card }]}><Text style={[styles.pillText, { color: colors.text }]}>Active</Text></View>
              </View>
            </View>
            <Text style={[styles.ticketDesc, { color: colors.textSecondary }]}>Entry to rooftop lounge party</Text>
            <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>August 21  •  Sat, Sep 9  •  8:00 PM</Text>
            <View style={styles.ticketFooter}>
              <View>
                <Text style={[styles.ticketPrice, { color: colors.text }]}>$45</Text>
                <Text style={[styles.ticketSubPrice, { color: colors.textSecondary }]}>per ticket</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.ticketSubPrice, { color: colors.textSecondary }]}>Earnings</Text>
                <Text style={[styles.ticketEarnings, { color: colors.text }]}>$200</Text>
              </View>
            </View>
          </View>

          {/* VIP */}
          <View style={[styles.ticketCard, { borderColor: colors.border }]}>
            <View style={styles.ticketHeader}>
              <Text style={[styles.ticketName, { color: colors.text }]}>VIP</Text>
              <View style={styles.ticketPills}>
                <View style={[styles.pillGrey, { backgroundColor: colors.card }]}><Text style={[styles.pillText, { color: colors.text }]}>10/100</Text></View>
                <View style={[styles.pillGrey, { backgroundColor: colors.card }]}><Text style={[styles.pillText, { color: colors.text }]}>Active</Text></View>
              </View>
            </View>
            <Text style={[styles.ticketDesc, { color: colors.textSecondary }]}>Priority entry, includes seated area and complimentary drinks.</Text>
            <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>August 21  •  Sat, Sep 9  •  8:00 PM</Text>
            <View style={styles.ticketFooter}>
              <View>
                <Text style={[styles.ticketPrice, { color: colors.text }]}>$45</Text>
                <Text style={[styles.ticketSubPrice, { color: colors.textSecondary }]}>per ticket</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.ticketSubPrice, { color: colors.textSecondary }]}>Earnings</Text>
                <Text style={[styles.ticketEarnings, { color: colors.text }]}>$200</Text>
              </View>
            </View>
          </View>

          {/* Early Bird */}
          <View style={[styles.ticketCard, { borderColor: colors.border }]}>
            <View style={styles.ticketHeader}>
              <Text style={[styles.ticketName, { color: colors.text }]}>Early Bird</Text>
              <View style={styles.ticketPills}>
                <View style={[styles.pillWhite, { backgroundColor: colors.text }]}><Text style={[styles.pillTextDark, { color: colors.background }]}>20/20</Text></View>
                <View style={[styles.pillGrey, { backgroundColor: colors.card }]}><Text style={[styles.pillText, { color: colors.text }]}>Done</Text></View>
              </View>
            </View>
            <Text style={[styles.ticketDesc, { color: colors.textSecondary }]}>Entry to rooftop lounge party</Text>
            <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>August 21  •  Sat, Sep 9  •  8:00 PM</Text>
            <View style={styles.ticketFooter}>
              <View>
                <Text style={[styles.ticketPrice, { color: colors.text }]}>$45</Text>
                <Text style={[styles.ticketSubPrice, { color: colors.textSecondary }]}>per ticket</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.ticketSubPrice, { color: colors.textSecondary }]}>Earnings</Text>
                <Text style={[styles.ticketEarnings, { color: colors.text }]}>$200</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sales Report */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10, marginBottom: 15 }]}>Sales Report</Text>
        <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartArea}>
            <View style={styles.yAxis}>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$1k</Text>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$750</Text>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$500</Text>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$250</Text>
              <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$0</Text>
            </View>
            <View style={styles.barsContainer}>
              <View style={styles.gridLines}>
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
                <View style={[styles.gridLine, { backgroundColor: colors.border }]} />
              </View>
              <View style={styles.barsRow}>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '60%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Oct 11</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '80%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Oct 12</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '50%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Oct 13</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '70%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Oct 14</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '90%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Oct 15</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '85%', backgroundColor: colors.primary }]} /><Text style={[styles.xLabel, { color: colors.textSecondary }]}>Oct 16</Text></View>
              </View>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Product</Text>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/profile-screen/product-stat')}
          >
            <Text style={[styles.seeAllText, { color: colors.text }]}>See Stat</Text>
            <HugeiconsIcon icon={ArrowRight02Icon} size={14} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Products List */}
        <View style={styles.productsList}>
          {[1, 2, 3].map((item, index) => (
            <View key={index} style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=300' }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]}>Medusa Skin Whitening Cream</Text>
                <Text style={[styles.productStock, { color: '#2DB46D' }]}>45 items left</Text>
                <View style={styles.productFooter}>
                  <Text style={[styles.productPrice, { color: colors.text }]}>$45.00</Text>
                  <TouchableOpacity style={[styles.viewBtn, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.viewBtnText, { color: colors.background }]}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
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
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  largeBalance: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  gridItem: {
    width: '50%',
    marginBottom: 20,
  },
  mediumBalance: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  smallLabel: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallBalance: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    flexWrap: 'wrap',
    gap: 6,
  },
  avatarsRow: {
    flexDirection: 'row',
    marginRight: 4,
  },
  tinyAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
  },
  legendDot: {
    fontSize: 11,
  },
  statsContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  locationContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
  },
  locationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cityText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationDetail: {
    fontSize: 12,
    marginBottom: 4,
  },
  locationDetailLabel: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
  },
  ticketsList: {
    gap: 15,
    marginBottom: 30,
  },
  ticketCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketPills: {
    flexDirection: 'row',
    gap: 8,
  },
  pillGrey: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillWhite: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pillTextDark: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  ticketDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
    paddingRight: 20,
  },
  ticketDate: {
    fontSize: 11,
    marginBottom: 15,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ticketPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  ticketSubPrice: {
    fontSize: 10,
    marginTop: 2,
  },
  ticketEarnings: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartSection: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 30,
  },
  chartArea: {
    flexDirection: 'row',
    height: 180,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 15,
    paddingBottom: 20,
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
    paddingBottom: 20,
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
    marginBottom: 10,
  },
  xLabel: {
    fontSize: 9,
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 11,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
