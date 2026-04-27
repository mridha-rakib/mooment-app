import React from "react";
import { StyleSheet, Text, View } from "react-native";
import FeedPost, { PostData } from "../FeedPost";
import { ProfileTabType } from "./ProfileTabs";

type ProfileContentProps = {
  activeTab: ProfileTabType;
  posts: PostData[];
};

export default function ProfileContent({ activeTab, posts }: ProfileContentProps) {
  return (
    <View style={styles.container}>
      {activeTab === 'feed' ? (
        posts.map((post) => (
          <FeedPost 
            key={post.id} 
            post={post} 
            onCommentPress={() => {}} 
            onSharePress={() => {}} 
          />
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No content in this category yet.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E9B',
    textAlign: 'center',
  }
});
