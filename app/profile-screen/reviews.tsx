import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { getUserReviews, type UserReviewResponse } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReviewCardProps = {
  colors: ReturnType<typeof useTheme>["colors"];
  onOpenProfile: () => void;
  review: UserReviewResponse;
};

const PAGE_SIZE = 30;

const formatReviewTime = (createdAt: string) => {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

function ReviewCard({ colors, onOpenProfile, review }: ReviewCardProps) {
  const authorName = review.author?.name ?? "Mooment User";

  return (
    <View style={[styles.reviewCard, { backgroundColor: "#111112", borderColor: colors.border }]}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity style={styles.userInfo} onPress={onOpenProfile} activeOpacity={0.7}>
          {review.author?.avatarUrl ? (
            <Image source={{ uri: review.author.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.card }]}>
              <Text style={[styles.avatarInitial, { color: colors.text }]}>
                {authorName.trim().charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <Text style={[styles.userName, { color: colors.text }]}>{authorName}</Text>
        </TouchableOpacity>
        <Feather
          name={review.liked ? "thumbs-up" : "thumbs-down"}
          size={16}
          color={review.liked ? colors.primary : colors.textSecondary}
        />
      </View>
      <TouchableOpacity onPress={onOpenProfile} activeOpacity={0.7}>
        <Text style={[styles.reviewText, { color: colors.text }]}>{review.text}</Text>
      </TouchableOpacity>
      {review.event?.name ? (
        <Text style={[styles.eventName, { color: colors.textSecondary }]} numberOfLines={1}>
          {review.event.name}
        </Text>
      ) : null}
      <Text style={[styles.reviewTime, { color: colors.textSecondary }]}>{formatReviewTime(review.createdAt)}</Text>
    </View>
  );
}

export default function ReviewsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const authUser = useAuthStore((state) => state.user);
  const userId = params.userId ?? authUser?.id;
  const [reviews, setReviews] = useState<UserReviewResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadReviews = useCallback(async (nextPage = 1) => {
      if (!userId) {
        setReviews([]);
        setIsLoading(false);
        return;
      }

      if (nextPage === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const result = await getUserReviews(userId, { page: nextPage, limit: PAGE_SIZE });
        setReviews((current) => nextPage === 1 ? result.reviews : [...current, ...result.reviews]);
        setPage(nextPage);
        setHasMore(Boolean(result.pagination && result.pagination.page < result.pagination.totalPages));
      } catch {
        if (nextPage === 1) {
          setReviews([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }, [userId]);

  useEffect(() => {
    void loadReviews(1);
  }, [loadReviews]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    void loadReviews(page + 1);
  }, [hasMore, isLoading, isLoadingMore, loadReviews, page]);

  const openProfile = (review: UserReviewResponse) => {
    if (!review.author) {
      return;
    }

    router.push({
      pathname: "/profile-screen/user-profile",
      params: {
        userId: review.author.id,
        name: review.author.name,
        avatar: review.author.avatarUrl ?? "",
      },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reviews yet</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(review) => review.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} /> : null}
          renderItem={({ item: review }) => (
            <ReviewCard
              colors={colors}
              onOpenProfile={() => openProfile(review)}
              review={review}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: "700",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  reviewTime: {
    fontSize: 11,
    alignSelf: "flex-end",
  },
  eventName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  footerLoader: {
    paddingVertical: 18,
  },
});
