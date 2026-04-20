import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export type EventDetails = {
  isLive?: boolean;
  tags?: { label: string; bg?: string; color?: string }[];
  title?: string;
  datetime?: string;
  distance?: string;
  attendeesAvatars?: string[];
  attendeesCount?: number;
};

export type PostData = {
  id: string;
  authorName: string;
  authorAvatar: string;
  timeAgo: string;
  caption?: string; 
  mediaUris: string[];
  ticketsCount?: number;
  likedBy?: string;
  headerLabel?: string;
  isPublic?: boolean;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  eventDetails?: EventDetails;
};

export default function FeedPost({ post }: { post: PostData }) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentMediaIndex) {
      setCurrentMediaIndex(roundIndex);
    }
  };

  return (
    <View style={styles.postWrapper}>
      {/* Header Context Labels */}
      {post.headerLabel && (
        <Text style={styles.headerLabelText}>{post.headerLabel}</Text>
      )}
      {post.likedBy && (
        <Text style={styles.likedByText}>
          <Text style={styles.likedByNormal}>liked by </Text>
          {post.likedBy}
        </Text>
      )}
      
      <View style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.postAuthorInfo}>
            <Image source={{ uri: post.authorAvatar }} style={styles.postAvatar} />
            <View>
              <Text style={styles.postAuthor}>{post.authorName}</Text>
              <View style={styles.timeRow}>
                <Text style={styles.postTime}>{post.timeAgo}</Text>
                {post.isPublic && (
                  <>
                    <Text style={styles.dotSeparator}> • </Text>
                    <Feather name="globe" size={10} color="#8E8E9B" />
                  </>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.postHeaderActions}>
            <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
              <Feather name="plus" size={12} color="#D4B0EB" />
              <Text style={styles.followBtnText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <Feather name="more-horizontal" size={20} color="#8E8E9B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Text */}
        {post.caption ? (
          <Text style={styles.postCaption}>{post.caption}</Text>
        ) : null}

        {/* Post Media - Dynamic Horizontal Scrolling Carousel */}
        <View style={[styles.postMediaContainer, !post.caption && styles.mediaNoTopMargin]}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
          >
            {post.mediaUris.map((uri, index) => (
              <Image 
                key={index}
                source={{ uri }} 
                style={styles.postImage} 
              />
            ))}
          </ScrollView>

          {/* Conditional Layout: Standard vs Event Details */}
          {post.eventDetails ? (
            <>
              {/* Event Live Badge */}
              {post.eventDetails.isLive && (
                <View style={styles.liveNowBadge}>
                  <View style={styles.liveNowDot} />
                  <Text style={styles.liveNowText}>Live Now</Text>
                </View>
              )}

              {/* Event Overlay Bottom Info */}
              <View style={styles.eventOverlayBottom}>
                <View style={styles.eventTagsRow}>
                  {post.eventDetails.tags?.map((tag, i) => (
                    <View key={i} style={[styles.eventTag, { backgroundColor: tag.bg || '#FFFFFF' }]}>
                      <Text style={[styles.eventTagText, { color: tag.color || '#000000' }]}>{tag.label}</Text>
                    </View>
                  ))}
                </View>
                
                <Text style={styles.eventTitle}>{post.eventDetails.title}</Text>
                <Text style={styles.eventSubtitle}>
                  {post.eventDetails.datetime} • {post.eventDetails.distance}
                </Text>
                
                <View style={styles.eventAttendeesRow}>
                  <View style={styles.avatarCluster}>
                    {post.eventDetails.attendeesAvatars?.map((uri, i) => (
                      <Image 
                        key={i} 
                        source={{ uri }} 
                        style={[
                          styles.avatarSmall, 
                          { zIndex: (post.eventDetails?.attendeesAvatars?.length || 0) - i },
                          i > 0 && { marginLeft: -8 }
                        ]} 
                      />
                    ))}
                  </View>
                  <Text style={styles.attendeesText}>{post.eventDetails.attendeesCount} going</Text>
                </View>

                {/* View Map Button inside Overlay */}
                <TouchableOpacity style={styles.viewMapBtn} activeOpacity={0.8}>
                  <Text style={styles.viewMapText}>View Map</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Media Counters & Badges (Standard) */}
              {post.mediaUris.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentMediaIndex + 1}/{post.mediaUris.length}
                  </Text>
                </View>
              )}

              {post.ticketsCount !== undefined && post.ticketsCount > 0 && (
                <TouchableOpacity style={styles.ticketFab} activeOpacity={0.9}>
                  <Ionicons name="ticket-outline" size={24} color="#FFFFFF" />
                  <View style={styles.ticketBadge}>
                    <Text style={styles.ticketBadgeText}>{post.ticketsCount}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Post Footer Actions */}
        {(post.likesCount !== undefined || post.commentsCount !== undefined || post.sharesCount !== undefined) && (
          <View style={styles.postFooter}>
            {post.likesCount !== undefined && (
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Ionicons name="heart" size={22} color="#F2245C" />
                <Text style={styles.actionText}>{post.likesCount}</Text>
              </TouchableOpacity>
            )}
            {post.commentsCount !== undefined && (
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Feather name="message-circle" size={22} color="#8E8E9B" />
                <Text style={styles.actionText}>{post.commentsCount}</Text>
              </TouchableOpacity>
            )}
            {post.sharesCount !== undefined && (
              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Feather name="share" size={22} color="#8E8E9B" />
                <Text style={styles.actionText}>{post.sharesCount}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  postWrapper: {
    marginBottom: 20,
  },
  headerLabelText: {
    color: "#8E8E9B",
    fontSize: 14,
    fontWeight: "500",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  likedByText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  likedByNormal: {
    fontWeight: "normal",
    color: "#8E8E9B",
  },
  postCard: {
    backgroundColor: "#13131A", 
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  postAuthorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  postAuthor: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  postTime: {
    color: "#8E8E9B",
    fontSize: 11,
  },
  dotSeparator: {
    color: "#8E8E9B",
    fontSize: 10,
  },
  postHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4B0EB", 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  followBtnText: {
    color: "#D4B0EB",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  moreBtn: {
    padding: 4,
  },
  postCaption: {
    color: "#D0D0D8", 
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  postMediaContainer: {
    width: "100%",
    height: 340,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  mediaNoTopMargin: {
    marginTop: 4, // Add a tiny bit of space if no caption exists
  },
  postImage: {
    width: width - 64, 
    height: "100%",
  },
  imageCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  ticketFab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(14, 13, 18, 0.7)", 
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ticketBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#F2245C", 
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  ticketBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  /* Event Overlay Styles */
  liveNowBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 216, 105, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(22, 216, 105, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveNowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16D869',
    marginRight: 6,
  },
  liveNowText: {
    color: '#16D869',
    fontSize: 11,
    fontWeight: 'bold',
  },
  eventOverlayBottom: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FFFFFF',
    paddingLeft: 12,
  },
  eventTagsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  eventTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  eventTagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 10,
  },
  eventAttendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCluster: {
    flexDirection: 'row',
    marginRight: 8,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  attendeesText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  viewMapBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewMapText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
