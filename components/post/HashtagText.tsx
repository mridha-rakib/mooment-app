import { splitHashtagText } from '@/lib/hashtags';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

type HashtagTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  hashtagStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export default function HashtagText({ children, style, hashtagStyle, numberOfLines }: HashtagTextProps) {
  const router = useRouter();
  const parts = useMemo(() => splitHashtagText(children), [children]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => part.hashtag ? (
        <Text
          key={`${part.hashtag}-${index}`}
          style={hashtagStyle}
          onPress={() => router.push({ pathname: '/discover-screen/hashtag', params: { tag: part.hashtag } })}
          suppressHighlighting={false}
        >
          {part.text}
        </Text>
      ) : part.text)}
    </Text>
  );
}
