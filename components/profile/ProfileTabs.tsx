import { useTheme } from "@/hooks/useTheme";
import { Home01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export type ProfileTabType = 'feed' | 'events' | 'shop';

type ProfileTabsProps = {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
  isOwnProfile?: boolean;
};

export default function ProfileTabs({ activeTab, onTabChange, isOwnProfile = true }: ProfileTabsProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'feed' && [styles.activeTab, { borderBottomColor: colors.text }]]}
        onPress={() => onTabChange('feed')}
      >
        <HugeiconsIcon icon={Home01Icon} size={22} color={activeTab === 'feed' ? colors.text : colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'events' && [styles.activeTab, { borderBottomColor: colors.text }]]}
        onPress={() => onTabChange('events')}
      >
        <Svg width="16" height="19" viewBox="0 0 16 19" fill="none">
          <Path d="M9.389 14.61C8.97567 14.198 8.769 13.6997 8.769 13.115C8.769 12.5303 8.97567 12.0317 9.389 11.619C9.80233 11.2063 10.301 10.9997 10.885 10.999C11.4697 10.999 11.9683 11.2057 12.381 11.619C12.7937 12.0323 13 12.531 13 13.115C13 13.699 12.7933 14.1977 12.38 14.611C11.9667 15.0243 11.4683 15.2307 10.885 15.23C10.3017 15.2293 9.803 15.0227 9.389 14.61ZM1.616 18.23C1.15533 18.23 0.771 18.076 0.463 17.768C0.155 17.46 0.000666667 17.0757 0 16.615V3.845C0 3.385 0.154333 3.001 0.463 2.693C0.771667 2.385 1.156 2.23067 1.616 2.23H3.385V0H4.462V2.23H11.616V0H12.616V2.23H14.385C14.845 2.23 15.2293 2.38433 15.538 2.693C15.8467 3.00167 16.0007 3.386 16 3.846V16.615C16 17.075 15.846 17.4593 15.538 17.768C15.23 18.0767 14.8453 18.2307 14.384 18.23H1.616ZM1.616 17.23H14.385C14.5383 17.23 14.6793 17.166 14.808 17.038C14.9367 16.91 15.0007 16.7687 15 16.614V7.846H1V16.615C1 16.7683 1.064 16.9093 1.192 17.038C1.32 17.1667 1.461 17.2307 1.615 17.23M1 6.845H15V3.845C15 3.69167 14.936 3.55067 14.808 3.422C14.68 3.29333 14.5387 3.22933 14.384 3.23H1.616C1.462 3.23 1.32067 3.294 1.192 3.422C1.06333 3.55 0.999333 3.69133 1 3.846V6.845Z" fill={activeTab === 'events' ? colors.text : colors.textSecondary} />
        </Svg>
      </TouchableOpacity>

      {isOwnProfile && (
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shop' && [styles.activeTab, { borderBottomColor: colors.text }]]}
          onPress={() => onTabChange('shop')}
        >
          <HugeiconsIcon icon={ShoppingBag01Icon} size={22} color={activeTab === 'shop' ? colors.text : colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 25,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
});
