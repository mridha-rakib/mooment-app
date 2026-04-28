import { Feather } from "@expo/vector-icons";
import { Calendar01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CreatorDashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Creator Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <HugeiconsIcon icon={Calendar01Icon} size={20} color="#8E8E9B" />
            <Text style={styles.actionText}>Create Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <HugeiconsIcon icon={ShoppingBag01Icon} size={20} color="#8E8E9B" />
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>
        </View>

        {/* Main Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.sectionLabel}>Available Balance For this Month</Text>
          <Text style={styles.mainBalance}>$ 55.00</Text>

          <View style={styles.balanceSplit}>
            <View style={styles.balanceColumn}>
              <Text style={styles.subLabel}>Available Mooment Credit{'\n'}Balance</Text>
              <Text style={styles.subBalance}>MCB 55.00</Text>
            </View>
            <Feather name="arrow-right" size={16} color="#8E8E9B" style={styles.arrowIcon} />
            <View style={styles.balanceColumn}>
              <Text style={styles.subLabel}>Available Mooment{'\n'}Balance</Text>
              <Text style={styles.subBalance}>$ 55.00</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterText}>Weekly</Text>
            <Feather name="chevron-down" size={14} color="#8E8E9B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterText}>Month</Text>
            <Feather name="chevron-down" size={14} color="#8E8E9B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterPill}>
            <Text style={styles.filterText}>Year</Text>
            <Feather name="chevron-down" size={14} color="#8E8E9B" />
          </TouchableOpacity>
        </View>

        {/* Earnings */}
        <View style={styles.earningsSection}>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>All Earnings</Text>
            <Text style={styles.earningAmount}>$ 11000.00</Text>
          </View>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>All Earnings</Text>
            <Text style={styles.earningAmount}>MCB 55.00</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>Ticket Sold</Text>
            <Text style={styles.statValue}>200</Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>Product Sold</Text>
            <Text style={styles.statValue}>200</Text>
          </View>
        </View>

        {/* All Events List */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>All Events</Text>
          
          {[1, 2, 3].map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.eventCard}
              onPress={() => router.push('/profile-screen/event-dashboard')}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200' }} 
                style={styles.eventImage} 
              />
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>Rooftop Session Vol.4</Text>
                <Text style={styles.eventDetails}>Sat, Sep 9  •  9:00  •  <Feather name="lock" size={10} /></Text>
                
                <View style={styles.eventBottom}>
                  <View style={styles.avatarsRow}>
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }} style={styles.tinyAvatar} />
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }} style={[styles.tinyAvatar, { marginLeft: -8 }]} />
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100' }} style={[styles.tinyAvatar, { marginLeft: -8 }]} />
                  </View>
                  <Text style={styles.goingText}>41 going  •  {index === 2 ? '88 tickets left' : 'Sold Out'}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#8E8E9B" style={styles.eventChevron} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Total Sales</Text>
            <TouchableOpacity style={styles.chartFilter}>
              <Text style={styles.chartFilterText}>Year</Text>
              <Feather name="chevron-down" size={14} color="#8E8E9B" />
            </TouchableOpacity>
          </View>

          <View style={styles.chartArea}>
            {/* Y Axis */}
            <View style={styles.yAxis}>
              <Text style={styles.axisLabel}>$1k</Text>
              <Text style={styles.axisLabel}>$750</Text>
              <Text style={styles.axisLabel}>$500</Text>
              <Text style={styles.axisLabel}>$250</Text>
              <Text style={styles.axisLabel}>$0</Text>
            </View>
            
            {/* Bars */}
            <View style={styles.barsContainer}>
              <View style={styles.gridLines}>
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
              </View>

              <View style={styles.barsRow}>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '60%' }]} /><Text style={styles.xLabel}>Jan</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '80%' }]} /><Text style={styles.xLabel}>Feb</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '50%' }]} /><Text style={styles.xLabel}>Mar</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '70%' }]} /><Text style={styles.xLabel}>Apr</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '90%' }]} /><Text style={styles.xLabel}>May</Text></View>
                <View style={styles.barWrapper}><View style={[styles.bar, { height: '85%' }]} /><Text style={styles.xLabel}>Jun</Text></View>
              </View>
            </View>
          </View>
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
    paddingVertical: 15,
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
    fontWeight: '600',
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
  actionRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1A1A22',
    backgroundColor: '#13131A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceSection: {
    marginBottom: 30,
  },
  sectionLabel: {
    color: '#8E8E9B',
    fontSize: 12,
    marginBottom: 8,
  },
  mainBalance: {
    color: '#FFFFFF',
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
    color: '#8E8E9B',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  subBalance: {
    color: '#FFFFFF',
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
    backgroundColor: '#EBEBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterText: {
    color: '#0e0d12',
    fontSize: 12,
    fontWeight: '600',
  },
  earningsSection: {
    marginBottom: 30,
    gap: 20,
  },
  earningItem: {},
  earningLabel: {
    color: '#8E8E9B',
    fontSize: 12,
    marginBottom: 4,
  },
  earningAmount: {
    color: '#FFFFFF',
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
    color: '#8E8E9B',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  eventsSection: {
    marginBottom: 30,
  },
  eventsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1A1A22',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDetails: {
    color: '#8E8E9B',
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
    borderColor: '#13131A',
  },
  goingText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  eventChevron: {
    marginLeft: 10,
  },
  chartSection: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1A1A22',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartFilterText: {
    color: '#8E8E9B',
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
    paddingBottom: 20, // keep grid lines aligned with y-axis
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
    marginBottom: 10, // space above label
  },
  xLabel: {
    color: '#8E8E9B',
    fontSize: 10,
  },
});
