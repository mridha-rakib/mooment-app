import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import UserAvatar from "@/components/ui/UserAvatar";
import {
  addEventMember,
  getEventMembers,
  removeEventMember,
  type EventMemberResponse,
} from "@/lib/events";
import { getStorageFileUrl } from "@/lib/storage";
import {
  getFriendUsers,
  getUserFollowers,
  getUserFollowing,
  type ProfileFollowUserResponse,
} from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";

const CONNECTION_LIMIT = 200;

const resolveAvatar = (key?: string | null, url?: string | null) => {
  if (url) return url;
  if (key) {
    try {
      return getStorageFileUrl(key);
    } catch {
      return null;
    }
  }
  return null;
};

const getHandle = (username?: string) => {
  if (!username) return null;
  const clean = username.trim().replace(/^@+/, "");
  return clean ? `@${clean}` : null;
};

export default function EventMembersScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const currentUser = useAuthStore((state) => state.user);

  const [members, setMembers] = useState<EventMemberResponse[]>([]);
  const [following, setFollowing] = useState<ProfileFollowUserResponse[]>([]);
  const [search, setSearch] = useState("");
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const filteredFollowing = useMemo(() => {
    const q = search.trim().toLowerCase();
    return following.filter((u) => {
      if (memberIds.has(u.id)) return false;
      if (u.id === currentUser?.id) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.username ?? "").toLowerCase().includes(q)
      );
    });
  }, [following, memberIds, search, currentUser?.id]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.username ?? "").toLowerCase().includes(q),
    );
  }, [members, search]);

  const loadMembers = useCallback(async () => {
    if (!eventId) return;
    setIsLoadingMembers(true);
    try {
      const data = await getEventMembers(eventId);
      setMembers(data);
    } catch {
      Alert.alert("Unable to load members", "Please try again.");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [eventId]);

  const loadFollowing = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingFollowing(true);
    try {
      const [followingData, followersData, friendData] = await Promise.all([
        getUserFollowing(currentUser.id, undefined, CONNECTION_LIMIT),
        getUserFollowers(currentUser.id, undefined, CONNECTION_LIMIT),
        getFriendUsers(undefined, CONNECTION_LIMIT),
      ]);
      const friendProfileData: ProfileFollowUserResponse[] = friendData.map((u) => ({
        ...u,
        isFollowing: true,
      }));
      const seen = new Set<string>();
      const merged: ProfileFollowUserResponse[] = [];
      for (const u of [...followingData, ...followersData, ...friendProfileData]) {
        if (!seen.has(u.id)) {
          seen.add(u.id);
          merged.push(u);
        }
      }
      setFollowing(merged);
    } catch {
      setFollowing([]);
    } finally {
      setIsLoadingFollowing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadMembers();
    void loadFollowing();
  }, [loadMembers, loadFollowing]);

  const handleAdd = async (user: ProfileFollowUserResponse) => {
    if (!eventId || addingUserId) return;
    setAddingUserId(user.id);
    try {
      const updated = await addEventMember(eventId, user.id);
      setMembers(updated);
    } catch (error) {
      Alert.alert("Unable to add member", getAuthErrorMessage(error, "Please try again."));
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemove = (member: EventMemberResponse) => {
    if (!eventId || removingUserId) return;
    Alert.alert(
      "Remove Member",
      `Remove ${member.name} from this event?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemovingUserId(member.id);
            try {
              const updated = await removeEventMember(eventId, member.id);
              setMembers(updated);
            } catch (error) {
              Alert.alert("Unable to remove member", getAuthErrorMessage(error, "Please try again."));
            } finally {
              setRemovingUserId(null);
            }
          },
        },
      ],
    );
  };

  const renderMember = ({ item }: { item: EventMemberResponse }) => (
    <View style={styles.listItem}>
      <UserAvatar uri={resolveAvatar(item.avatarKey, item.avatarUrl)} name={item.name} size={48} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
        {getHandle(item.username) && (
          <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{getHandle(item.username)}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.removeBtn, { borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => handleRemove(item)}
        disabled={removingUserId === item.id}
      >
        {removingUserId === item.id ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Feather name="x" size={16} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderFollowingUser = ({ item }: { item: ProfileFollowUserResponse }) => (
    <View style={styles.listItem}>
      <UserAvatar uri={resolveAvatar(item.avatarKey, item.avatarUrl)} name={item.name} size={48} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
        {getHandle(item.username) && (
          <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{getHandle(item.username)}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
        onPress={() => handleAdd(item)}
        disabled={addingUserId === item.id}
      >
        {addingUserId === item.id ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Feather name="plus" size={16} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{count}</Text>
    </View>
  );

  const isLoading = isLoadingMembers || isLoadingFollowing;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Members</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search people..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => ""}
          renderItem={null}
          ListHeaderComponent={
            <>
              {filteredMembers.length > 0 && (
                <>
                  {renderSectionHeader("Members", filteredMembers.length)}
                  {filteredMembers.map((item) => (
                    <View key={item.id}>
                      {renderMember({ item })}
                      <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    </View>
                  ))}
                </>
              )}

              {filteredMembers.length === 0 && !search && (
                <View style={styles.emptySection}>
                  <Feather name="users" size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No members yet
                  </Text>
                  <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                    Add your followers and people you follow
                  </Text>
                </View>
              )}

              {filteredFollowing.length > 0 && (
                <>
                  {renderSectionHeader("Add from connections", filteredFollowing.length)}
                  {filteredFollowing.map((item) => (
                    <View key={item.id}>
                      {renderFollowingUser({ item })}
                      <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    </View>
                  ))}
                </>
              )}

              {filteredFollowing.length === 0 && following.length > 0 && (
                <View style={styles.emptySection}>
                  <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                    All your connections have been added
                  </Text>
                </View>
              )}

              {filteredFollowing.length === 0 && following.length === 0 && (
                <View style={styles.emptySection}>
                  <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                    Follow people or gain followers to add members
                  </Text>
                </View>
              )}
            </>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerPlaceholder: {
    width: 36,
  },
  searchContainer: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
  },
  listItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    borderRadius: 21,
    height: 42,
    width: 42,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
  },
  userHandle: {
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    alignItems: "center",
    borderRadius: 20,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  removeBtn: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  separator: {
    height: 1,
    marginLeft: 70,
  },
  emptySection: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
