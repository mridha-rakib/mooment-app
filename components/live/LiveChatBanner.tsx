import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export type LiveChatBannerProps = {
  contextBold?: string;
  contextNormal?: string;
  title: string;
  listeningCount: number;
  avatars: string[];
};
export default function LiveChatBanner({ contextBold, contextNormal, title, listeningCount, avatars }: LiveChatBannerProps) {
  const router = useRouter();
  return (
    <View style={styles.wrapper}>
      {(contextBold || contextNormal) && (
        <Text style={styles.contextText}>
          {contextBold && <Text style={styles.contextBold}>{contextBold}</Text>}
          {contextNormal && <Text style={styles.contextNormal}> {contextNormal}</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push('/live-screen/live-room' as any)}
      >
        <View style={styles.content}>
          {/* Live Badge */}
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>Live</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.infoRow}>
              <View style={styles.avatarCluster}>
                {avatars.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={[
                      styles.avatar,
                      { zIndex: avatars.length - i },
                      i > 0 && { marginLeft: -8 }
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.listeningText}>{listeningCount} listening</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.joinBtn} 
            activeOpacity={0.8}
            onPress={() => router.push('/live-screen/live-room' as any)}
          >
            <Text style={styles.joinBtnText}>Join</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  contextText: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
  },
  contextBold: {
    color: '#D0D0D8',
    fontWeight: 'bold',
  },
  contextNormal: {
    color: '#8E8E9B',
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#13131A",
    borderWidth: 1,
    borderColor: "rgba(142, 84, 233, 0.4)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  liveBadge: {
    backgroundColor: "#F2545B",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  detailsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCluster: {
    flexDirection: "row",
    marginRight: 8,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#13131A",
  },
  listeningText: {
    color: "#8E8E9B",
    fontSize: 12,
  },
  joinBtn: {
    backgroundColor: "#B59EBE",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  joinBtnText: {
    color: "#0e0d12",
    fontSize: 13,
    fontWeight: "bold",
  },
});
