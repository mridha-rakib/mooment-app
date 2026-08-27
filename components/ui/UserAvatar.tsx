import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type UserAvatarProps = {
  uri?: string | null;
  name?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconSize?: number;
};

const getInitial = (name?: string | null) => {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return "";
  }

  return trimmedName.charAt(0).toUpperCase();
};

function UserAvatar({ uri, name, size, style, textStyle, iconSize }: UserAvatarProps) {
  const { colors, isDark } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUri = uri?.trim() || null;
  const initial = useMemo(() => getInitial(name), [name]);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  const avatarStyle = [
    styles.avatar,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    style,
  ];

  if (imageUri && !imageFailed) {
    return (
      <ExpoImage
        source={{ uri: imageUri }}
        style={avatarStyle}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={imageUri}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View style={[avatarStyle, styles.fallback, { backgroundColor: isDark ? '#2C2C2E' : '#C7C7CC' }]}>
      {initial ? (
        <Text
          style={[
            styles.initial,
            {
              color: colors.text,
              fontSize: Math.max(12, Math.round(size * 0.42)),
            },
            textStyle,
          ]}
        >
          {initial}
        </Text>
      ) : (
        <Feather name="user" size={iconSize ?? Math.round(size * 0.45)} color={colors.textSecondary} />
      )}
    </View>
  );
}

export default React.memo(UserAvatar);

const styles = StyleSheet.create({
  avatar: {
    overflow: "hidden",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontWeight: "700",
  },
});

