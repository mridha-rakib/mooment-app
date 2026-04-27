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

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentPurple: "#8E54E9",
  accentOrange: "#FF6B3D",
  accentGreen: "#16D869",
  border: "rgba(255, 255, 255, 0.1)",
};

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
          <View style={styles.greenDot} />
          <Text style={styles.availabilityText}>Tickets available</Text>
        </View>
        <Text style={styles.availabilityCount}>58 left</Text>
      </View>

      {/* General Ticket */}
      <View style={styles.ticketCard}>
        <View style={styles.rewardAppliedRow}>
          <View style={styles.rewardLeft}>
            <Text style={styles.rewardTitle}>Reward applied</Text>
            <Text style={styles.rewardSub}>Buy 1 get 1 Free</Text>
          </View>
          <TouchableOpacity style={styles.claimBtn}>
            <Text style={styles.claimBtnText}>Claim Reward</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ticketHeader}>
          <Text style={styles.ticketType}>General Ticket</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>42 left</Text>
          </View>
        </View>
        <Text style={styles.ticketDesc}>Entry from 9pm. Standing only.</Text>
        <Text style={styles.expiryText}>
          Expires in • Sat, Sep 19 • 4:00 PM
        </Text>
        
        <View style={styles.ticketFooter}>
           <View>
              <Text style={styles.ticketPrice}>£45</Text>
              <Text style={styles.perTicketText}>per ticket</Text>
           </View>
           <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn}>
                <Feather name="minus" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>1</Text>
              <TouchableOpacity style={styles.counterBtnActive}>
                <Feather name="plus" size={14} color={COLORS.text} />
              </TouchableOpacity>
           </View>
        </View>
      </View>

      {/* VIP Ticket */}
      <View style={styles.ticketCard}>
        <View style={styles.rewardAppliedRow}>
          <View style={styles.rewardLeft}>
            <Text style={styles.rewardTitle}>Reward applied</Text>
            <Text style={styles.rewardSub}>Buy 1 get 1 Free</Text>
          </View>
          <View style={styles.claimedBadge}>
            <Feather name="check" size={12} color={COLORS.accentGreen} />
            <Text style={styles.claimedText}>Claimed</Text>
          </View>
        </View>

        <View style={styles.ticketHeader}>
          <Text style={styles.ticketType}>VIP</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>42 left</Text>
          </View>
        </View>
        <Text style={styles.ticketDesc}>Priority entry. Includes seated area and complimentary drinks.</Text>
        <Text style={styles.expiryText}>
          Expires in • Sat, Sep 19 • 4:00 PM
        </Text>
        
        <View style={styles.ticketFooter}>
           <View>
              <Text style={styles.ticketPrice}>£85</Text>
              <Text style={styles.perTicketText}>per ticket</Text>
           </View>
           <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn}>
                <Feather name="minus" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>1</Text>
              <TouchableOpacity style={styles.counterBtnActive}>
                <Feather name="plus" size={14} color={COLORS.text} />
              </TouchableOpacity>
           </View>
        </View>
      </View>

      {/* Early Bird (Sold Out) */}
      <View style={[styles.ticketCard, { opacity: 0.5 }]}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketType}>Early Bird</Text>
          <View style={[styles.countBadge, { backgroundColor: 'rgba(255, 77, 77, 0.1)' }]}>
            <Text style={[styles.countBadgeText, { color: '#FF4D4D' }]}>Sold Out</Text>
          </View>
        </View>
        <Text style={styles.ticketDesc}>Entry from 9pm. Standing only.</Text>
        <Text style={styles.expiryText}>
          Expires in • Sat, Sep 19 • 4:00 PM
        </Text>
        
        <View style={styles.ticketFooter}>
           <View>
              <Text style={styles.ticketPrice}>£30</Text>
              <Text style={styles.perTicketText}>per ticket</Text>
           </View>
           <View style={styles.counter}>
              <View style={styles.counterBtn}>
                <Feather name="minus" size={14} color={COLORS.border} />
              </View>
              <Text style={[styles.counterValue, { color: COLORS.border }]}>1</Text>
              <View style={styles.counterBtn}>
                <Feather name="plus" size={14} color={COLORS.border} />
              </View>
           </View>
        </View>
      </View>

      {/* Secure Payment Note */}
      <View style={styles.secureBadge}>
        <Feather name="shield" size={14} color={COLORS.accentGreen} />
        <Text style={styles.secureText}>
          Payment held securely until event completes
        </Text>
      </View>
    </View>
  );

  const renderRewards = () => (
    <View style={{ marginTop: 20 }}>
      {REWARDS_DATA.map((item) => (
        <View key={item.id} style={styles.rewardCard}>
          <View style={styles.rewardMain}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.rewardImage} />
            )}
            <View style={styles.rewardInfo}>
              <View style={styles.rewardHeader}>
                <Text style={styles.rewardTitleText} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.left && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{item.left}</Text>
                  </View>
                )}
                {item.status === "expired" && (
                  <View style={[styles.countBadge, { backgroundColor: "rgba(255, 77, 77, 0.1)" }]}>
                    <Text style={[styles.countBadgeText, { color: "#FF4D4D" }]}>Expired</Text>
                  </View>
                )}
              </View>
              
              {item.desc && !item.image && (
                <Text style={styles.rewardDescText}>{item.desc}</Text>
              )}
              
              <Text style={styles.rewardExpiryText}>
                Expires in • {item.expires}
              </Text>

              <View style={styles.rewardFooterRow}>
                {item.status === "claimed" && (
                   <View style={styles.claimedBadge}>
                    <Feather name="check" size={12} color={COLORS.accentGreen} />
                    <Text style={styles.claimedText}>Claimed</Text>
                  </View>
                )}
                {item.status === "available" && (
                  <TouchableOpacity style={styles.claimRewardBtn}>
                    <Text style={styles.claimRewardBtnText}>Claim Reward</Text>
                  </TouchableOpacity>
                )}
                {item.status === "expired" && item.image && (
                   <View style={[styles.countBadge, { backgroundColor: "rgba(255, 77, 77, 0.1)" }]}>
                    <Text style={[styles.countBadgeText, { color: "#FF4D4D" }]}>Expired</Text>
                  </View>
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
      <View style={styles.tabWrapper}>
        <LinearGradient
          colors={["#18181c", "#c1c0c5", "#18181c"]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 1 }}
          style={styles.subTabBorder}
        >
          <BlurView intensity={40} tint="dark" style={styles.subTabBg}>
            <TouchableOpacity
              onPress={() => setAccessSubTab("Tickets")}
              style={styles.subTabItem}
            >
              {accessSubTab === "Tickets" ? (
                <LinearGradient
                  colors={["#18181c", "#c1c0c5", "#18181c"]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.activeBtnBorder}
                >
                  <View style={styles.activeBtnInner}>
                    <Text style={[styles.subTabText, styles.subTabTextActive]}>
                      Tickets
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <Text style={styles.subTabText}>Tickets</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAccessSubTab("Rewards")}
              style={styles.subTabItem}
            >
              {accessSubTab === "Rewards" ? (
                <LinearGradient
                  colors={["#18181c", "#c1c0c5", "#18181c"]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.activeBtnBorder}
                >
                  <View style={styles.activeBtnInner}>
                    <Text style={[styles.subTabText, styles.subTabTextActive]}>
                      Rewards
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <Text style={styles.subTabText}>Rewards</Text>
              )}
            </TouchableOpacity>
          </BlurView>
        </LinearGradient>
      </View>

      {accessSubTab === "Tickets" ? renderTickets() : renderRewards()}
    </View>
  );
};

export default AccessTab;

const styles = StyleSheet.create({
  tabWrapper: {
    borderRadius: 12,
  },
  subTabBorder: {
    borderRadius: 12,
    overflow: "hidden",
    padding: 0.5,
  },
  subTabBg: {
    flexDirection: "row",
    backgroundColor: "#1c1b20",
    borderRadius: 11,
    padding: 6,
    height: 50,
    overflow: "hidden",
    gap: 4,
  },
  subTabItem: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeBtnBorder: {
    flex: 1,
    borderRadius: 8,
    padding: 0.5,
  },
  activeBtnInner: {
    backgroundColor: "#38373a",
    borderRadius: 7,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subTabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  subTabTextActive: {
    color: COLORS.text,
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
    backgroundColor: COLORS.accentGreen,
  },
  availabilityText: {
    color: COLORS.accentGreen,
    fontSize: 14,
    fontWeight: "600",
  },
  availabilityCount: {
    color: COLORS.accentGreen,
    fontSize: 14,
    fontWeight: "bold",
  },
  ticketCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  rewardAppliedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  rewardLeft: {
    flex: 1,
  },
  rewardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  rewardSub: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  claimBtn: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  claimBtnText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
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
    color: COLORS.accentGreen,
    fontSize: 11,
    fontWeight: "bold",
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  ticketType: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  countBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "bold",
  },
  ticketDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  expiryText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  ticketPrice: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold",
  },
  perTicketText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 4,
    gap: 12,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnActive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
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
    color: COLORS.accentGreen,
    fontSize: 12,
    fontWeight: "600",
  },
  /* Rewards Styles */
  rewardCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
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
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  rewardDescText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  rewardExpiryText: {
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.text,
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
