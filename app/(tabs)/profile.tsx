import React from "react";
import ProfileView, { UserProfileData } from "../../components/ProfileView";
import { PostData } from "../../components/FeedPost";

const MOCK_ME: UserProfileData = {
  id: 'me',
  name: 'Alex Johnson',
  handle: '@alex_j',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
  bio: 'Digital goodies designer everything is designed.',
  stats: {
    posts: 42,
    reviews: 12,
    followers: 1200,
    following: 450
  }
};

const MOCK_POSTS: PostData[] = [
  {
    id: 'p1',
    postType: 'standard',
    authorName: 'Alex Johnson',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
    timeAgo: '2 min ago',
    caption: 'Setting up for tonight. The view from up here is unreal',
    mediaUris: ['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600'],
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25
  },
  {
    id: 'p2',
    postType: 'standard',
    authorName: 'Alex Johnson',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
    timeAgo: '1 day ago',
    caption: 'Exploring new textures for the upcoming project.',
    mediaUris: ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600'],
    likesCount: 42,
    commentsCount: 10,
    sharesCount: 5
  }
];

export default function ProfileTab() {
  return (
    <ProfileView 
      user={MOCK_ME} 
      posts={MOCK_POSTS} 
    />
  );
}
