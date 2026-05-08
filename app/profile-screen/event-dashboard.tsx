import { Feather } from "@expo/vector-icons";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import React from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import BackButton from "@/components/ui/BackButton";

export default function EventDashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Rooftop Session Vol.4</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Earnings Top */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.label}>Total Earnings</Text>
            <Text style={styles.largeBalance}>$ 1100.00</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.shareText}>Share Event</Text>
            <Feather name="chevron-down" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 4-Grid Earnings */}
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Ticket Earnings</Text>
            <Text style={styles.mediumBalance}>$ 550.00</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Product Earnings</Text>
            <Text style={styles.mediumBalance}>$ 550.00</Text>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.smallLabel}>Ticket Earnings from{'\n'}Mooment Credit</Text>
            <View style={styles.valueRow}>
              <Text style={styles.smallBalance}>550.00</Text>
              <Feather name="chevron-up" size={14} color="#8E8E9B" />
            </View>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.smallLabel}>Ticket Earnings</Text>
            <Text style={styles.mediumBalance}>$ 550.00</Text>
          </View>

          <View style={styles.gridItem}>
            <Text style={styles.smallLabel}>Product Earnings from{'\n'}Mooment Credit</Text>
            <View style={styles.valueRow}>
              <Text style={styles.smallBalance}>550.00</Text>
              <Feather name="chevron-down" size={14} color="#8E8E9B" />
            </View>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.smallLabel}>Product Earnings</Text>
            <Text style={styles.mediumBalance}>$ 550.00</Text>
          </View>
        </View>

        {/* Status Legend */}
        <View style={styles.legendRow}>
          <View style={styles.avatarsRow}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} style={styles.tinyAvatar} />
            <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }} style={[styles.tinyAvatar, { marginLeft: -8 }]} />
          </View>
          <TouchableOpacity
            style={styles.legendItem}
            onPress={() => router.push('/profile-screen/attendee-list')}
          >
            <View style={[styles.dot, { backgroundColor: '#2DB46D' }]} />
            <Text style={styles.legendText}>47 Ongoing</Text>
          </TouchableOpacity>
          <Text style={styles.legendDot}>•</Text>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#E2B93B' }]} />
            <Text style={styles.legendText}>41 canceled</Text>
          </View>
          <Text style={styles.legendDot}>•</Text>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#D64646' }]} />
            <Text style={styles.legendText}>0 canceled</Text>
          </View>
          <Text style={styles.legendDot}>•</Text>
          <View style={styles.legendItem}>
            <Feather name="lock" size={10} color="#8E8E9B" style={{ marginRight: 4 }} />
            <Text style={styles.legendText}>No show</Text>
          </View>
        </View>

        {/* Sales Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.label}>Ticket Sold</Text>
            <Text style={styles.statValue}>200</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.label}>Product Sold</Text>
            <Text style={styles.statValue}>200</Text>
          </View>
        </View>

        {/* Location Info */}
        <View style={styles.locationContainer}>
          <View style={styles.locationTop}>
            <Feather name="lock" size={14} color="#FFFFFF" />
            <Text style={styles.cityText}>New York City</Text>
          </View>
          <Text style={styles.locationDetail}><Text style={styles.locationDetailLabel}>Venue:</Text> The Rooftop Lounge</Text>
          <Text style={styles.locationDetail}><Text style={styles.locationDetailLabel}>Address:</Text> 123 Main Street, New York, NY 10001</Text>
        </View>

        {/* Ticket Sales */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ticket Sales</Text>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/profile-screen/ticket-stat')}
          >
            <Text style={styles.seeAllText}>See Stat</Text>
            <HugeiconsIcon icon={ArrowRight02Icon} size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Ticket List */}
        <View style={styles.ticketsList}>
          {/* General */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketName}>General Ticket</Text>
              <View style={styles.ticketPills}>
                <View style={styles.pillGrey}><Text style={styles.pillText}>50/100</Text></View>
                <View style={styles.pillGrey}><Text style={styles.pillText}>Active</Text></View>
              </View>
            </View>
            <Text style={styles.ticketDesc}>Entry to rooftop lounge party</Text>
            <Text style={styles.ticketDate}>August 21  •  Sat, Sep 9  •  8:00 PM</Text>
            <View style={styles.ticketFooter}>
              <View>
                <Text style={styles.ticketPrice}>$45</Text>
                <Text style={styles.ticketSubPrice}>per ticket</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.ticketSubPrice}>Earnings</Text>
                <Text style={styles.ticketEarnings}>$200</Text>
              </View>
            </View>
          </View>

          {/* VIP */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketName}>VIP</Text>
              <View style={styles.ticketPills}>
                <View style={styles.pillGrey}><Text style={styles.pillText}>10/100</Text></View>
                <View style={styles.pillGrey}><Text style={styles.pillText}>Active</Text></View>
              </View>
            </View>
            <Text style={styles.ticketDesc}>Priority entry, includes seated area and complimentary drinks.</Text>
            <Text style={styles.ticketDate}>August 21  •  Sat, Sep 9  •  8:00 PM</Text>
            <View style={styles.ticketFooter}>
              <View>
                <Text style={styles.ticketPrice}>$45</Text>
                <Text style={styles.ticketSubPrice}>per ticket</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.ticketSubPrice}>Earnings</Text>
                <Text style={styles.ticketEarnings}>$200</Text>
              </View>
            </View>
          </View>

          {/* Early Bird */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketName}>Early Bird</Text>
              <View style={styles.ticketPills}>
                <View style={styles.pillWhite}><Text style={styles.pillTextDark}>20/20</Text></View>
                <View style={styles.pillGrey}><Text style={styles.pillText}>Done</Text></View>
              </View>
            </View>
            <Text style={styles.ticketDesc}>Entry to rooftop lounge party</Text>
            <Text style={styles.ticketDate}>August 21  •  Sat, Sep 9  •  8:00 PM</Text>
            <View style={styles.ticketFooter}>
              <View>
                <Text style={styles.ticketPrice}>$45</Text>
                <Text style={styles.ticketSubPrice}>per ticket</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.ticketSubPrice}>Earnings</Text>
                <Text style={styles.ticketEarnings}>$200</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sales Report */}
        <Text style={[styles.sectionTitle, { marginTop: 10, marginBottom: 15 }]}>Sales Report</Text>
        <View style={styles.chartSection}>
          <View style={styles.chartArea}>
            <View style={styles.yAxis}>
              <Text style={styles.axisLabel}>$1k</Text>
              <Text style={styles.axisLabel}>$750</Text>
              <Text style={styles.axisLabel}>$500</Text>
              <Text style={styles.axisLabel}>$250</Text>
              <Text style={styles.axisLabel}>$0</Text>
            </View>
            <View style={styles.barsContainer}>
              <View style={styles.gridLines}>
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
              </View>
              <View style={styles.barsRow}>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '60%' }]} /><Text style={styles.xLabel}>Oct 11</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '80%' }]} /><Text style={styles.xLabel}>Oct 12</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '50%' }]} /><Text style={styles.xLabel}>Oct 13</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '70%' }]} /><Text style={styles.xLabel}>Oct 14</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '90%' }]} /><Text style={styles.xLabel}>Oct 15</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '85%' }]} /><Text style={styles.xLabel}>Oct 16</Text></View>
              </View>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Product</Text>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/profile-screen/product-stat')}
          >
            <Text style={styles.seeAllText}>See Stat</Text>
            <HugeiconsIcon icon={ArrowRight02Icon} size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Products List */}
        <View style={styles.productsList}>
          {[1, 2, 3].map((item, index) => (
            <View key={index} style={styles.productCard}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=300' }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>Medusa Skin Whitening Cream</Text>
                <Text style={styles.productStock}>45 items left</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>$45.00</Text>
                  <TouchableOpacity style={styles.viewBtn}>
                    <Text style={styles.viewBtnText}>View</Text>
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
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
    color: '#8E8E9B',
    fontSize: 12,
    marginBottom: 4,
  },
  largeBalance: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  shareText: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  smallLabel: {
    color: '#8E8E9B',
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
    color: '#FFFFFF',
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
    borderColor: '#0e0d12',
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
    color: '#8E8E9B',
    fontSize: 11,
  },
  legendDot: {
    color: '#8E8E9B',
    fontSize: 11,
  },
  statsContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1A1A22',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  locationContainer: {
    borderWidth: 1,
    borderColor: '#1A1A22',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  locationDetail: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
  },
  locationDetailLabel: {
    color: '#8E8E9B',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  ticketsList: {
    gap: 15,
    marginBottom: 30,
  },
  ticketCard: {
    borderWidth: 1,
    borderColor: '#1A1A22',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketPills: {
    flexDirection: 'row',
    gap: 8,
  },
  pillGrey: {
    backgroundColor: '#2A2A32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillWhite: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  pillTextDark: {
    color: '#0e0d12',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ticketDesc: {
    color: '#8E8E9B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
    paddingRight: 20,
  },
  ticketDate: {
    color: '#8E8E9B',
    fontSize: 11,
    marginBottom: 15,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ticketPrice: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  ticketSubPrice: {
    color: '#8E8E9B',
    fontSize: 10,
    marginTop: 2,
  },
  ticketEarnings: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartSection: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1A1A22',
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
    color: '#8E8E9B',
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
    backgroundColor: '#1A1A22',
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
    backgroundColor: '#B2ABBA',
    borderRadius: 4,
    marginBottom: 10,
  },
  xLabel: {
    color: '#8E8E9B',
    fontSize: 9,
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#13131A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A22',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productStock: {
    color: '#2DB46D',
    fontSize: 11,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewBtn: {
    backgroundColor: '#B2ABBA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    color: '#0e0d12',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
