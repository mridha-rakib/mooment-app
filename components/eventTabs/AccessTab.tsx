import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import SegmentedControl from "../ui/SegmentedControl";

// Removed hardcoded COLORS to use useTheme hook

const REWARDS_DATA = [
  {
    id: "1",
    title: "Buy 1 T-shirt get 1 free",
    desc: "Buy 1 T-shirt get 1 free",
    expires: "Sat, Sep 19 • 4:00 PM",
    left: "42 left",
    status: "available",
  },
  {
    id: "2",
    title: "Buy 1 T-shirt get 1 free",
    desc: "Buy 1 T-shirt get 1 free",
    expires: "Sat, Sep 19 • 4:00 PM",
    left: "42 left",
    status: "claimed",
  },
  {
    id: "3",
    title: "Buy 1 T-shirt get 1 free",
    desc: "Buy 1 T-shirt get 1 free",
    expires: "Sat, Sep 19 • 4:00 PM",
    left: "42 left",
    status: "claimed",
  },
  {
    id: "4",
    title: "Buy 1 T-shirt get 1 free",
    desc: "Buy 1 T-shirt get 1 free",
    expires: "Sat, Sep 19 • 4:00 PM",
    status: "expired",
  },
  {
    id: "5",
    title: "Buy 1 T-shirt get 1 free",
    expires: "Sat, Sep 19 • 4:00 PM",
    status: "expired",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "6",
    title: "Buy 1 T-shirt get 1 free",
    expires: "Sat, Sep 19 • 4:00 PM",
    left: "42 left",
    status: "claimed",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop",
  },
  {
    id: "7",
    title: "Buy 1 T-shirt get 1 free",
    expires: "Sat, Sep 19 • 4:00 PM",
    left: "42 left",
    status: "available",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop",
  },
];

const AccessTab = () => {
  const { colors, isDark } = useTheme();
  const [accessSubTab, setAccessSubTab] = useState("Tickets");

  const renderTickets = () => (
    <View style={{ marginTop: 20 }}>
      {/* Max Tickets Alert */}
      <View style={styles.alertBanner}>
        <Feather name="info" size={16} color="#FF6B3D" />
        <Text style={styles.alertText}>
          You can only buy maximum of 2 tickets
        </Text>
      </View>

      {/* Availability Status */}
      <View style={styles.availabilityRow}>
        <View style={styles.availabilityLabel}>
          <View style={[styles.greenDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.availabilityText, { color: colors.success }]}>Tickets available</Text>
        </View>
        <Text style={[styles.availabilityCount, { color: colors.success }]}>58 left</Text>
      </View>

      {/* General Ticket */}
      <View style={[styles.ticketCard, { backgroundColor: isDark ? "#161521" : colors.backgroundSecondary, borderColor: colors.border }]}>
        <View style={styles.rewardAppliedRow}>
          <View style={styles.rewardLeft}>
            <Text style={[styles.rewardTitle, { color: colors.text }]}>Reward applied</Text>
            <Text style={[styles.rewardSub, { color: colors.textSecondary }]}>Buy 1 get 1 Free</Text>
          </View>
          <TouchableOpacity style={[styles.claimBtn, { backgroundColor: colors.text }]}>
            <Text style={[styles.claimBtnText, { color: colors.background }]}>Claim Reward</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.ticketInnerCard, { backgroundColor: isDark ? "#0F0E13" : colors.card }]}>
          <View style={styles.ticketHeader}>
            <Text style={[styles.ticketType, { color: colors.text }]}>General Ticket</Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? "#313036" : colors.backgroundSecondary }]}>
              <Text style={[styles.countBadgeText, { color: colors.text }]}>42 left</Text>
            </View>
          </View>
          <Text style={[styles.ticketDesc, { color: colors.textSecondary }]}>Entry from 9pm. Standing only.</Text>
          <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
            Expires in • Sat, Sep 19 • 4:00 PM
          </Text>
          
          <View style={styles.ticketFooter}>
             <View>
                <Text style={[styles.ticketPrice, { color: colors.text }]}>£45</Text>
                <Text style={[styles.perTicketText, { color: colors.textSecondary }]}>per ticket</Text>
             </View>
             <View style={[styles.counter, { backgroundColor: isDark ? "#222129" : colors.backgroundSecondary }]}>
                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: isDark ? "#313036" : colors.border }]}>
                  <Feather name="minus" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.counterValue, { color: colors.text }]}>1</Text>
                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: isDark ? "#313036" : colors.border }]}>
                  <Feather name="plus" size={16} color={colors.text} />
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </View>

      {/* VIP Ticket */}
      <View style={[styles.ticketCard, { backgroundColor: isDark ? "#161521" : colors.backgroundSecondary, borderColor: colors.border }]}>
        <View style={styles.rewardAppliedRow}>
          <View style={styles.rewardLeft}>
            <Text style={[styles.rewardTitle, { color: colors.text }]}>Reward applied</Text>
            <Text style={[styles.rewardSub, { color: colors.textSecondary }]}>Buy 1 get 1 Free</Text>
          </View>
          <View style={[styles.claimedBadge, { backgroundColor: isDark ? "rgba(22, 216, 105, 0.1)" : "rgba(22, 216, 105, 0.05)" }]}>
            <Feather name="check" size={12} color={colors.success} />
            <Text style={[styles.claimedText, { color: colors.success }]}>Claimed</Text>
          </View>
        </View>

        <View style={[styles.ticketInnerCard, { backgroundColor: isDark ? "#0F0E13" : colors.card }]}>
          <View style={styles.ticketHeader}>
            <Text style={[styles.ticketType, { color: colors.text }]}>VIP</Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? "#313036" : colors.backgroundSecondary }]}>
              <Text style={[styles.countBadgeText, { color: colors.text }]}>42 left</Text>
            </View>
          </View>
          <Text style={[styles.ticketDesc, { color: colors.textSecondary }]}>Priority entry. Includes seated area and complimentary drinks.</Text>
          <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
            Expires in • Sat, Sep 19 • 4:00 PM
          </Text>
          
          <View style={styles.ticketFooter}>
             <View>
                <Text style={[styles.ticketPrice, { color: colors.text }]}>£85</Text>
                <Text style={[styles.perTicketText, { color: colors.textSecondary }]}>per ticket</Text>
             </View>
             <View style={[styles.counter, { backgroundColor: isDark ? "#222129" : colors.backgroundSecondary }]}>
                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: isDark ? "#313036" : colors.border }]}>
                  <Feather name="minus" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.counterValue, { color: colors.text }]}>1</Text>
                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: isDark ? "#313036" : colors.border }]}>
                  <Feather name="plus" size={16} color={colors.text} />
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </View>

      {/* Early Bird (Sold Out) */}
      <View style={[styles.ticketCard, { backgroundColor: isDark ? "#161521" : colors.backgroundSecondary, borderColor: colors.border, opacity: 0.5 }]}>
        <View style={[styles.ticketInnerCard, { backgroundColor: isDark ? "#0F0E13" : colors.card }]}>
          <View style={styles.ticketHeader}>
            <Text style={[styles.ticketType, { color: colors.text }]}>Early Bird</Text>
            <View style={[styles.countBadge, { backgroundColor: 'rgba(255, 77, 77, 0.1)' }]}>
              <Text style={[styles.countBadgeText, { color: '#FF4D4D' }]}>Sold Out</Text>
            </View>
          </View>
          <Text style={[styles.ticketDesc, { color: colors.textSecondary }]}>Entry from 9pm. Standing only.</Text>
          <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
            Expires in • Sat, Sep 19 • 4:00 PM
          </Text>
          
          <View style={styles.ticketFooter}>
             <View>
                <Text style={[styles.ticketPrice, { color: colors.text }]}>£30</Text>
                <Text style={[styles.perTicketText, { color: colors.textSecondary }]}>per ticket</Text>
             </View>
             <View style={[styles.counter, { backgroundColor: isDark ? "#222129" : colors.backgroundSecondary }]}>
                <View style={[styles.counterBtn, { backgroundColor: isDark ? "#313036" : colors.border }]}>
                  <Feather name="minus" size={16} color={colors.textSecondary} />
                </View>
                <Text style={[styles.counterValue, { color: colors.textSecondary }]}>1</Text>
                <View style={[styles.counterBtn, { backgroundColor: isDark ? "#313036" : colors.border }]}>
                  <Feather name="plus" size={16} color={colors.textSecondary} />
                </View>
             </View>
          </View>
        </View>
      </View>

      {/* Secure Payment Note */}
      <View style={[styles.secureBadge, { backgroundColor: isDark ? "rgba(22, 216, 105, 0.05)" : "rgba(22, 216, 105, 0.02)" }]}>
        <Feather name="shield" size={14} color={colors.success} />
        <Text style={[styles.secureText, { color: colors.success }]}>
          Payment held securely until event completes
        </Text>
      </View>
    </View>
  );

  const renderRewards = () => (
    <View style={{ marginTop: 20 }}>
      {REWARDS_DATA.map((item) => (
        <View key={item.id} style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rewardMain}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.rewardImage} />
            )}
            <View style={styles.rewardInfo}>
              <View style={styles.rewardHeader}>
                <Text style={[styles.rewardTitleText, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.left && (
                  <View style={[styles.countBadge, { backgroundColor: isDark ? "#313036" : colors.backgroundSecondary }]}>
                    <Text style={[styles.countBadgeText, { color: colors.text }]}>{item.left}</Text>
                  </View>
                )}
                {item.status === "expired" && (
                  <View style={[styles.countBadge, { backgroundColor: "rgba(255, 77, 77, 0.1)" }]}>
                    <Text style={[styles.countBadgeText, { color: "#FF4D4D" }]}>Expired</Text>
                  </View>
                )}
              </View>
              
              {item.desc && !item.image && (
                <Text style={[styles.rewardDescText, { color: colors.textSecondary }]}>{item.desc}</Text>
              )}
              
              <Text style={[styles.rewardExpiryText, { color: colors.textSecondary }]}>
                Expires in • {item.expires}
              </Text>
 
              <View style={styles.rewardFooterRow}>
                {item.status === "claimed" && (
                   <View style={[styles.claimedBadge, { backgroundColor: isDark ? "rgba(22, 216, 105, 0.1)" : "rgba(22, 216, 105, 0.05)" }]}>
                    <Feather name="check" size={12} color={colors.success} />
                    <Text style={[styles.claimedText, { color: colors.success }]}>Claimed</Text>
                  </View>
                )}
                {item.status === "available" && (
                  <TouchableOpacity style={[styles.claimRewardBtn, { backgroundColor: colors.text }]}>
                    <Text style={[styles.claimRewardBtnText, { color: colors.background }]}>Claim Reward</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View>
      {/* Sub-Tabs / Toggle */}
      <SegmentedControl
        options={["Tickets", "Rewards"]}
        selectedOption={accessSubTab}
        onSelect={setAccessSubTab}
        containerStyle={{ marginTop: 10, marginBottom: 10 }}
      />

      {accessSubTab === "Tickets" ? renderTickets() : renderRewards()}
    </View>
  );
};

export default AccessTab;

const styles = StyleSheet.create({
  tabWrapper: {
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 61, 0.1)",
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  alertText: {
    color: "#FF6B3D",
    fontSize: 13,
    fontWeight: "600",
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  availabilityLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  availabilityCount: {
    fontSize: 14,
    fontWeight: "bold",
  },
  ticketCard: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  rewardAppliedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  rewardLeft: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  rewardSub: {
    fontSize: 14,
  },
  claimBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  claimBtnText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "bold",
  },
  ticketInnerCard: {
    borderRadius: 18,
    margin: 4,
    padding: 16,
  },
  claimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(22, 216, 105, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  claimedText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  ticketType: {
    color: "#B8B8C1",
    fontSize: 22,
    fontWeight: "bold",
  },
  countBadge: {
    backgroundColor: "#313036",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  ticketDesc: {
    color: "#8E8E9B",
    fontSize: 15,
    marginBottom: 8,
  },
  expiryText: {
    color: "#8E8E9B",
    fontSize: 13,
    marginBottom: 20,
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketPrice: {
    fontSize: 28,
    fontWeight: "bold",
  },
  perTicketText: {
    color: "#8E8E9B",
    fontSize: 12,
    marginTop: 2,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222129",
    borderRadius: 14,
    padding: 6,
    gap: 14,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#313036",
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 24,
    fontWeight: "600",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(22, 216, 105, 0.05)",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 10,
  },
  secureText: {
    fontSize: 12,
    fontWeight: "600",
  },
  /* Rewards Styles */
  rewardCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  rewardMain: {
    flexDirection: "row",
    gap: 12,
  },
  rewardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  rewardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rewardTitleText: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  rewardDescText: {
    fontSize: 12,
    marginBottom: 4,
  },
  rewardExpiryText: {
    fontSize: 11,
    marginBottom: 8,
  },
  rewardFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    minHeight: 24,
  },
  claimRewardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  claimRewardBtnText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
});
