import { Home01Icon, Calendar03Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

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
        <HugeiconsIcon icon={Calendar03Icon} size={22} color={activeTab === 'events' ? colors.text : colors.textSecondary} />
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
