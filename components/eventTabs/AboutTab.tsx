import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Mapbox from "@rnmapbox/maps";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, Linking, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { navigateToProfile } from "@/lib/profileNavigation";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";
import { APP_MAP_STYLE_URL } from "@/lib/mapStyles";
import { getStorageFileUrl } from "@/lib/storage";
import { followUser, unfollowUser } from "@/lib/users";
import type { EventAgeRestriction, EventHost, EventLocation } from "@/lib/events";
import { useAuthStore } from "@/stores/authStore";
import { getCategoryColor } from "@/constants/categoryColors";
import FullScreen from "../event/FullScreen";
import SegmentedControl from "../ui/SegmentedControl";

const { width } = Dimensions.get("window");
Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const isDirectMediaUrl = (value?: string | null) =>
  Boolean(value && /^(https?:|data:|file:|content:)/i.test(value.trim()));

const getNonEmptyString = (...values: (string | null | undefined)[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

type AboutTabProps = {
  description?: string | null;
  ageRestriction?: EventAgeRestriction | null;
  location?: EventLocation | null;
  host?: EventHost | null;
  eventImageUris?: string[];
  isHostMode?: boolean;
  isDraft?: boolean;
  category?: string | null;
  onHostFollowChange?: (isFollowing: boolean) => void;
};

const GALLERY_IMAGES = [
  {
    id: "1",
    uri: "https://images.unsplash.com/photo-1531050171669-01912ad4110b?q=80&w=600&auto=format&fit=crop",
    type: "image",
  },
  {
    id: "2",
    uri: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop",
    type: "image",
  },
  {
    id: "3",
    uri: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop",
    type: "image",
  },
  {
    id: "4",
    uri: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop",
    type: "carousel",
  },
  {
    id: "5",
    uri: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop",
    type: "video",
  },
  {
    id: "6",
    uri: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600&auto=format&fit=crop",
    type: "video",
  },
  {
    id: "7",
    uri: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=600&auto=format&fit=crop",
    type: "carousel",
  },
  {
    id: "8",
    uri: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=600&auto=format&fit=crop",
    type: "video",
  },
  {
    id: "9",
    uri: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop",
    type: "image",
  },
];

const formatAgeLabel = (ageRestriction?: EventAgeRestriction | null) => {
  if (ageRestriction === "18_plus") {
    return "18+ only";
  }

  if (ageRestriction === "21_plus") {
    return "21+ only";
  }

  return "All ages";
};

const formatCompactCount = (value?: number | null) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value ?? 0));

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const resolveHostAvatar = (host?: EventHost | null) => {
  const avatarKey = getNonEmptyString(host?.avatarKey);

  if (avatarKey) {
    try {
      return getStorageFileUrl(avatarKey);
    } catch {
      // Fall through to avatarUrl below.
    }
  }

  const avatarUrl = getNonEmptyString(host?.avatarUrl);

  if (avatarUrl) {
    return isDirectMediaUrl(avatarUrl) ? avatarUrl : "";
  }

  return "";
};

const getHostInitial = (host?: EventHost | null) => {
  const source = host?.name?.trim() || host?.username?.trim() || "H";

  return source.charAt(0).toUpperCase();
};

type LocationLineProps = {
  label: string;
  value?: string | null;
  labelColor: string;
  valueColor: string;
};

const LocationLine = ({ label, value, labelColor, valueColor }: LocationLineProps) => {
  if (!value) {
    return null;
  }

  return (
    <Text style={[styles.detailLabel, { color: labelColor }]}>
      {label}: <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </Text>
  );
};

type EventLocationMapProps = {
  location?: EventLocation | null;
  markerImage: string;
  markerLabel: string;
  fallbackColor: string;
  markerColor: string;
  onExpand: () => void;
};

const EventLocationMap = ({
  location,
  markerImage,
  markerLabel,
  fallbackColor,
  markerColor,
  onExpand,
}: EventLocationMapProps) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const hasCoordinates = isFiniteCoordinate(latitude) && isFiniteCoordinate(longitude);
  const coordinate: [number, number] | null = hasCoordinates ? [longitude, latitude] : null;

  useEffect(() => {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  }, []);

  if (!coordinate) {
    return (
      <View style={[styles.mapContainer, styles.mapFallback, { backgroundColor: fallbackColor }]}>
        <Ionicons name="map-outline" size={22} color="#B3B3B3" />
        <Text style={styles.mapFallbackText}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={APP_MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          animationDuration={0}
          centerCoordinate={coordinate}
          zoomLevel={14.5}
        />
        <Mapbox.MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
          <View
            style={[styles.eventMarkerButton, { borderColor: markerColor, shadowColor: markerColor }]}
            accessibilityLabel={`${markerLabel} location`}
          >
            {markerImage ? (
              <Image source={{ uri: markerImage }} style={styles.eventMarkerImage} contentFit="cover" />
            ) : (
              <View style={[styles.eventMarkerDot, { backgroundColor: markerColor }]} />
            )}
          </View>
        </Mapbox.MarkerView>
      </Mapbox.MapView>
      <TouchableOpacity style={styles.expandMapBtn} activeOpacity={0.85} onPress={onExpand}>
        <Feather name="maximize" size={16} color="#B3B3B3" />
      </TouchableOpacity>
    </View>
  );
};

const AboutTab = ({
  description,
  ageRestriction,
  location,
  host,
  eventImageUris = [],
  isHostMode = false,
  isDraft = false,
  category,
  onHostFollowChange,
}: AboutTabProps) => {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { colors, isDark } = useTheme();
  const sharedLocation = useAuthStore((state) =>
    state.user?.currentLocationSharingEnabled ? state.user.currentLocation : null,
  );
  const [subTab, setSubTab] = useState("Description");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isHostFollowing, setIsHostFollowing] = useState(Boolean(host?.isFollowing));
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [hostFollowerDelta, setHostFollowerDelta] = useState(0);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [hostAvatarFailed, setHostAvatarFailed] = useState(false);

  const hostAvatar = useMemo(() => resolveHostAvatar(host), [host]);
  const hostInitial = useMemo(() => getHostInitial(host), [host]);
  const hostFollowers = useMemo(() => {
    const baseFollowers = typeof host?.followersCount === "number" ? host.followersCount : 0;

    return formatCompactCount(baseFollowers + hostFollowerDelta);
  }, [host?.followersCount, hostFollowerDelta]);

  const hostEvents = useMemo(() => formatCompactCount(host?.eventsCount), [host?.eventsCount]);

  const markerColor = getCategoryColor(category);
  const locationLabel = location?.searchLabel || location?.venue || location?.address || "Location";
  const primaryEventImage = eventImageUris[0] ?? "";
  const hasEventCoordinates = isFiniteCoordinate(location?.latitude) && isFiniteCoordinate(location?.longitude);
  const hasSharedCoordinates =
    isFiniteCoordinate(sharedLocation?.latitude) && isFiniteCoordinate(sharedLocation?.longitude);
  const galleryImages = eventImageUris.length > 0
    ? eventImageUris.map((uri, index) => ({ id: `event-banner-${index}`, uri, type: "image" }))
    : GALLERY_IMAGES;
  const cardBackground = isDark ? "rgba(17, 17, 17, 0.8)" : colors.card;
  const mutedCardBackground = isDark ? "rgba(17, 17, 17, 0.8)" : "rgba(0, 0, 0, 0.03)";
  const isAgeRestricted = ageRestriction === "18_plus" || ageRestriction === "21_plus";

  const openInGoogleMaps = () => {
    setShowMapsModal(false);
    const lat = location?.latitude;
    const lng = location?.longitude;
    let url: string;
    if (isFiniteCoordinate(lat) && isFiniteCoordinate(lng)) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else {
      const query = location?.address || location?.venue || locationLabel;
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    Linking.openURL(url);
  };

  const openEventMap = () => {
    if (!hasEventCoordinates) {
      return;
    }

    router.push({
      pathname: "/event-screen/map",
      params: {
        eventLatitude: String(location.latitude),
        eventLongitude: String(location.longitude),
        eventTitle: locationLabel,
        eventVenue: location?.venue ?? "",
        eventAddress: location?.address ?? "",
        markerImage: primaryEventImage,
        eventCategory: category ?? "",
        ...(hasSharedCoordinates
          ? {
              userLatitude: String(sharedLocation.latitude),
              userLongitude: String(sharedLocation.longitude),
            }
          : {}),
      },
    });
  };

  useEffect(() => {
    setIsHostFollowing(Boolean(host?.isFollowing));
    setHostFollowerDelta(0);
  }, [host?.id, host?.isFollowing]);

  useEffect(() => {
    setHostAvatarFailed(false);
  }, [hostAvatar]);

  const toggleHostFollow = async () => {
    if (!host?.id || isHostMode || isFollowPending) {
      return;
    }

    const wasFollowing = isHostFollowing;
    setIsHostFollowing(!wasFollowing);
    setHostFollowerDelta((current) => current + (wasFollowing ? -1 : 1));
    setIsFollowPending(true);

    try {
      const follow = wasFollowing ? await unfollowUser(host.id) : await followUser(host.id);
      setIsHostFollowing(follow.isFollowing);
      setHostFollowerDelta(follow.isFollowing === Boolean(host?.isFollowing) ? 0 : follow.isFollowing ? 1 : -1);
      onHostFollowChange?.(follow.isFollowing);
    } catch (error) {
      setIsHostFollowing(wasFollowing);
      setHostFollowerDelta((current) => current + (wasFollowing ? 1 : -1));
      Alert.alert(
        wasFollowing ? "Unable to unfollow" : "Unable to follow",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setIsFollowPending(false);
    }
  };

  const openHostProfile = () => {
    if (!host?.id) return;

    const hostName = host.name?.trim() || host.username?.trim() || "Host";

    navigateToProfile(router, currentUserId, {
      userId: host.id,
      name: hostName,
      avatar: hostAvatar,
      isFollowing: isHostFollowing,
    });
  };

  const renderGallery = () => (
    <View style={styles.galleryGrid}>
      {galleryImages.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.galleryItemContainer, { backgroundColor: colors.card }]}
          onPress={() => setSelectedImage(item.uri)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: item.uri }} style={styles.galleryImage} />
          {item.type === "carousel" && (
            <View style={styles.galleryIcon}>
              <Ionicons name="copy" size={12} color="#FFFFFF" />
            </View>
          )}
          {item.type === "video" && (
            <View style={styles.galleryIcon}>
              <Ionicons name="videocam" size={12} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View>
      <FullScreen
        visible={!!selectedImage}
        imageUri={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      <Modal
        visible={showMapsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMapsModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMapsModal(false)}>
          <View style={styles.mapsModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.mapsModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.mapsModalHeader}>
                  <View style={[styles.mapsModalIconContainer, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)" }]}>
                    <Ionicons name="map-outline" size={22} color={isDark ? colors.primary : colors.text} />
                  </View>
                  <Text style={[styles.mapsModalTitle, { color: colors.text }]}>Open in Google Maps?</Text>
                </View>
                <Text style={[styles.mapsModalDesc, { color: colors.textSecondary }]}>
                  Do you want to open this event location in Google Maps?
                </Text>
                <View style={styles.mapsModalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.mapsModalBtnOpen,
                      {
                        borderWidth: isDark ? 0 : 1,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={openInGoogleMaps}
                  >
                    <Feather name="map" size={16} color="#111111" />
                    <Text style={styles.mapsModalBtnOpenText}>Open Google Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mapsModalBtnCancel}
                    activeOpacity={0.8}
                    onPress={() => setShowMapsModal(false)}
                  >
                    <Feather name="x-circle" size={16} color="#D44343" />
                    <Text style={styles.mapsModalBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <SegmentedControl
        options={["Description", "Gallery"]}
        selectedOption={subTab}
        onSelect={setSubTab}
        containerStyle={{ marginTop: 16, marginBottom: 0 }}
        renderOption={(option, isSelected) => (
          <Ionicons
            name={
              option === "Description"
                ? isSelected
                  ? "document-text"
                  : "document-text-outline"
                : isSelected
                  ? "images"
                  : "images-outline"
            }
            size={20}
            color={isSelected ? colors.text : colors.textSecondary}
          />
        )}
      />

      <View style={styles.contentStack}>
        {subTab === "Description" ? (
          <>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {description?.trim() || "Description unavailable"}
            </Text>
            <View style={[styles.ageTag, { backgroundColor: isAgeRestricted ? "#FFFFFF" : "rgba(255, 255, 255, 0.08)" }]}>
              <Text style={[styles.ageTagText, { color: isAgeRestricted ? "#E83030" : colors.text }]}>
                {formatAgeLabel(ageRestriction)}
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Location</Text>
              <TouchableOpacity
                style={[styles.locationCard, { backgroundColor: cardBackground }]}
                activeOpacity={0.8}
                onPress={() => setShowMapsModal(true)}
              >
                <View style={styles.locationHeader}>
                  <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.locationCity, { color: colors.text }]} numberOfLines={1}>
                    {locationLabel}
                  </Text>
                </View>
                <View style={styles.locationDetails}>
                  <LocationLine label="Venue" value={location?.venue} labelColor={colors.text} valueColor={colors.textSecondary} />
                  <LocationLine label="Address" value={location?.address} labelColor={colors.text} valueColor={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <EventLocationMap
                location={location}
                markerImage={primaryEventImage}
                markerLabel={locationLabel}
                fallbackColor={cardBackground}
                markerColor={markerColor}
                onExpand={openEventMap}
              />
            </View>

            {location?.additionalInfo?.trim() ? (
              <View style={[styles.additionalInfoCard, { backgroundColor: mutedCardBackground }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Additional Info</Text>
                <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
                  {location.additionalInfo.trim()}
                </Text>
              </View>
            ) : null}

            {!isHostMode && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Host</Text>
                <View style={[styles.hostCard, { backgroundColor: cardBackground }]}>
                  <View style={styles.hostCardHeader}>
                    <TouchableOpacity activeOpacity={0.7} onPress={openHostProfile}>
                      {hostAvatar && !hostAvatarFailed ? (
                        <Image
                          source={{ uri: hostAvatar }}
                          style={styles.hostCardAvatar}
                          contentFit="cover"
                          onError={() => setHostAvatarFailed(true)}
                        />
                      ) : (
                        <View style={[styles.hostCardAvatar, styles.hostCardAvatarFallback]}>
                          <Text style={styles.hostCardAvatarFallbackText}>{hostInitial}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.hostCardInfo} activeOpacity={0.7} onPress={openHostProfile}>
                      <Text style={[styles.hostCardName, { color: colors.text }]}>{host?.name ?? "Host"}</Text>
                      {!!host?.username && (
                        <Text style={[styles.hostCardUser, { color: colors.textSecondary }]}>
                          @{host.username.replace(/^@+/, "")}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.followBtnLarge,
                        isHostFollowing && styles.followingBtnLarge,
                      ]}
                      activeOpacity={0.8}
                      disabled={isFollowPending}
                      onPress={toggleHostFollow}
                    >
                      <Text style={[styles.followBtnTextLarge, isHostFollowing && styles.followingBtnTextLarge]}>
                        {isHostFollowing ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.hostStatsRow}>
                    <Text style={[styles.hostStatItem, { color: colors.textSecondary }]}>
                      <Text style={[styles.hostStatValue, { color: colors.textSecondary }]}>{hostFollowers}</Text> Followers
                    </Text>
                    <Text style={[styles.hostStatItem, { color: colors.textSecondary }]}>
                      <Text style={[styles.hostStatValue, { color: colors.textSecondary }]}>{hostEvents}</Text> Events
                    </Text>
                  </View>
                  <Text style={[styles.hostBio, { color: colors.textSecondary }]}>
                    {host?.bio?.trim() || "Bio unavailable"}
                  </Text>
                </View>
              </>
            )}

            {isHostMode && !isDraft && (
              <View style={styles.withdrawalCard}>
                <Feather name="shield" size={20} color="#1D9E75" />
                <Text style={styles.withdrawalText}>Withdrawal will be available 72 hours after event completion</Text>
              </View>
            )}
          </>
        ) : (
          renderGallery()
        )}
      </View>
    </View>
  );
};

export default AboutTab;

const styles = StyleSheet.create({
  contentStack: {
    gap: 16,
    marginTop: 24,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  ageTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ageTagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionBlock: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  locationCard: {
    borderRadius: 12,
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationCity: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  locationDetails: {
    gap: 8,
    paddingLeft: 32,
  },
  detailLabel: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailValue: {
    fontWeight: "700",
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapFallbackText: {
    color: "#B3B3B3",
    fontSize: 13,
    fontWeight: "600",
  },
  eventMarkerButton: {
    alignItems: "center",
    backgroundColor: "#080808",
    borderRadius: 28,
    borderWidth: 3,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 12,
    width: 56,
  },
  eventMarkerImage: {
    height: "100%",
    width: "100%",
  },
  eventMarkerDot: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  expandMapBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(17, 17, 17, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  additionalInfoCard: {
    borderRadius: 12,
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  bulletItem: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 24,
  },
  hostCard: {
    borderRadius: 12,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hostCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  hostCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: "#C05178",
    borderWidth: 2,
  },
  hostCardAvatarFallback: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    overflow: "hidden",
  },
  hostCardAvatarFallbackText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  hostCardInfo: {
    flex: 1,
  },
  hostCardName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  hostCardUser: {
    fontSize: 12,
    lineHeight: 16,
  },
  followBtnLarge: {
    alignItems: "center",
    borderColor: "#AC86D4",
    borderRadius: 8,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  followingBtnLarge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
  },
  followBtnTextLarge: {
    color: "#AC86D4",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  followingBtnTextLarge: {
    color: "#8E8E9B",
    fontSize: 11,
    fontWeight: "600",
  },
  hostStatsRow: {
    flexDirection: "row",
    gap: 25,
  },
  hostStatItem: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  hostStatValue: {
    fontWeight: "700",
  },
  hostBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  withdrawalCard: {
    alignItems: "center",
    backgroundColor: "rgba(14, 198, 23, 0.1)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  withdrawalText: {
    color: "#1D9E75",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  galleryItemContainer: {
    width: (width - 48) / 3,
    aspectRatio: 0.75,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryIcon: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: [{ translateX: -12 }],
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mapsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  mapsModalCard: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    width: "100%",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  mapsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mapsModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  mapsModalTitle: {
    fontSize: 19,
    fontWeight: "700",
    flex: 1,
  },
  mapsModalDesc: {
    fontSize: 14,
    lineHeight: 22,
  },
  mapsModalButtons: {
    flexDirection: "column",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  mapsModalBtnCancel: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#150B0B",
    paddingVertical: 14,
    borderRadius: 12,
  },
  mapsModalBtnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D44343",
  },
  mapsModalBtnOpen: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
  },
  mapsModalBtnOpenText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    textAlign: "center",
  },
});
