import { Feather } from "@expo/vector-icons";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";

import { useTheme } from "@/hooks/useTheme";
import UserAvatar from "@/components/ui/UserAvatar";
import { getStorageFileUrl } from "@/lib/storage";
import { getFriendUsers, type FriendUserResponse } from "@/lib/users";
import { usePlanStore } from "@/stores/planStore";

const firstParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

const resolveAvatarUrl = (friend: FriendUserResponse) => {
  if (friend.avatarUrl) {
    return friend.avatarUrl;
  }

  if (!friend.avatarKey) {
    return null;
  }

  try {
    return getStorageFileUrl(friend.avatarKey);
  } catch {
    return null;
  }
};

export default function AddFriendScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = firstParam(params.planId);
  const plan = usePlanStore((state) => state.plans.find((item) => item.id === planId));
  const updatePlanFriends = usePlanStore((state) => state.updatePlanFriends);
  const [friends, setFriends] = useState<FriendUserResponse[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savingFriendId, setSavingFriendId] = useState<string | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(() => new Set(plan?.friendIds ?? []));

  useEffect(() => {
    setSelectedFriendIds(new Set(plan?.friendIds ?? []));
  }, [plan?.friendIds]);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    getFriendUsers(search.trim() || undefined)
      .then((data) => {
        if (!cancelled) {
          setFriends(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          Alert.alert("Unable to load friends", "Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [search]);

  const displayedFriends = useMemo(() => {
    const friendMap = new Map<string, FriendUserResponse>();

    for (const friend of plan?.friendUsers ?? []) {
      friendMap.set(friend.id, {
        id: friend.id,
        name: friend.name,
        username: friend.username,
        avatarKey: friend.avatarKey,
        avatarUrl: friend.avatarUrl,
      });
    }

    for (const friend of friends) {
      friendMap.set(friend.id, friend);
    }

    return [...friendMap.values()];
  }, [friends, plan?.friendUsers]);

  const toggleFriend = async (friend: FriendUserResponse) => {
    if (!plan || savingFriendId) {
      return;
    }

    const nextSelectedIds = new Set(selectedFriendIds);
    const isSelected = nextSelectedIds.has(friend.id);

    if (isSelected) {
      nextSelectedIds.delete(friend.id);
    } else {
      nextSelectedIds.add(friend.id);
    }

    const selectedFriends = displayedFriends.filter((item) => nextSelectedIds.has(item.id));
    if (!isSelected && !selectedFriends.some((item) => item.id === friend.id)) {
      selectedFriends.push(friend);
    }

    setSavingFriendId(friend.id);
    setSelectedFriendIds(nextSelectedIds);

    try {
      await updatePlanFriends(plan.id, selectedFriends);
    } catch {
      setSelectedFriendIds(selectedFriendIds);
      Alert.alert("Unable to update friends", "Please try again.");
    } finally {
      setSavingFriendId((currentId) => (currentId === friend.id ? null : currentId));
    }
  };

  return (
    <View style={[s.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
          <Feather name="x" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Add Friend</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.searchRow}>
        <View style={[s.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <HugeiconsIcon icon={Search01Icon} size={18} color={colors.textSecondary} style={s.searchIcon} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity onPress={() => setSearch("")}>
          <Text style={[s.cancelBtnText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {!plan ? (
        <View style={s.emptyState}>
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>Select a plan before adding friends.</Text>
        </View>
      ) : isLoading && displayedFriends.length === 0 ? (
        <View style={s.emptyState}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
          {displayedFriends.map((friend) => {
            const isSelected = selectedFriendIds.has(friend.id);
            const isSaving = savingFriendId === friend.id;

            return (
              <View key={friend.id} style={[s.userRow, { borderBottomColor: colors.border }]}>
                <UserAvatar uri={resolveAvatarUrl(friend)} name={friend.name} size={48} style={[s.avatar, { borderColor: colors.border }]} />
                <View style={s.userInfo}>
                  <Text style={[s.userName, { color: colors.text }]}>{friend.name}</Text>
                  <Text style={[s.userHandle, { color: colors.textSecondary }]}>
                    {friend.username ? `@${friend.username.replace(/^@+/, "")}` : "Friend"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    isSelected
                      ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
                      : { backgroundColor: buttonBackground(colors) },
                    isSaving && s.actionBtnDisabled,
                  ]}
                  onPress={() => toggleFriend(friend)}
                  activeOpacity={0.7}
                  disabled={isSaving || Boolean(savingFriendId && savingFriendId !== friend.id)}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={isSelected ? colors.textSecondary : buttonForeground(colors)} />
                  ) : (
                    <Text style={[s.actionBtnText, { color: isSelected ? colors.textSecondary : buttonForeground(colors) }]}>
                      {isSelected ? "Added" : "Add"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
          {!isLoading && displayedFriends.length === 0 && (
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No friends found.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  cancelBtnText: { fontSize: 15 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14, borderWidth: 1 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  userHandle: { fontSize: 13 },

  actionBtn: { width: 80, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  actionBtnDisabled: { opacity: 0.7 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  emptyText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});
