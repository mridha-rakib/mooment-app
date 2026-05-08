import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { PostData } from "@/components/post/FeedPost";
import ProfileView, { UserProfileData } from "@/components/profile/ProfileView";

export default function UserProfileScreen() {
  const params = useLocalSearchParams<{ userId: string; name: string; avatar: string }>();
  
  const userData: UserProfileData = {
    id: params.userId || 'u1',
    name: params.name || 'Jacob West',
    handle: `@${(params.name || 'jacob_west').toLowerCase().replace(' ', '_')}`,
    avatar: params.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    bio: 'Digital goodies designer everything is designed.',
    stats: {
      posts: 54,
      reviews: 54,
      followers: 834,
      following: 162
    }
  };

  const MOCK_POSTS: PostData[] = [
    {
      id: 'p1',
      postType: 'standard',
      authorName: userData.name,
      authorAvatar: userData.avatar,
      timeAgo: '2 min ago',
      caption: 'Setting up for tonight. The view from up here is unreal',
      mediaUris: ['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop'],
      likesCount: 25,
      commentsCount: 25,
      sharesCount: 25
    },
    {
      id: 'p2',
      postType: 'standard',
      authorName: userData.name,
      authorAvatar: userData.avatar,
      timeAgo: '15 min ago',
      caption: 'Setting up for tonight. The view from up here is unreal',
      mediaUris: ['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop'],
      likesCount: 25,
      commentsCount: 25,
      sharesCount: 25
    }
  ];

  return (
    <ProfileView 
      user={userData} 
      posts={MOCK_POSTS} 
      isOwnProfile={false} 
    />
  );
}
