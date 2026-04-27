import { Feather } from "@expo/vector-icons";
import { Home01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export type ProfileTabType = 'feed' | 'events' | 'shop';

type ProfileTabsProps = {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
};

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'feed' && styles.activeTab]} 
        onPress={() => onTabChange('feed')}
      >
        <HugeiconsIcon icon={Home01Icon} size={20} color={activeTab === 'feed' ? '#FFFFFF' : '#8E8E9B'} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'events' && styles.activeTab]} 
        onPress={() => onTabChange('events')}
      >
        <Feather name="calendar" size={20} color={activeTab === 'events' ? '#FFFFFF' : '#8E8E9B'} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'shop' && styles.activeTab]} 
        onPress={() => onTabChange('shop')}
      >
        <Feather name="shopping-bag" size={20} color={activeTab === 'shop' ? '#FFFFFF' : '#8E8E9B'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A22',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
  },
});
