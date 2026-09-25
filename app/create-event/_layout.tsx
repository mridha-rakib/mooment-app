import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { BackHandler } from "react-native";

export default function CreateEventLayout() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/(tabs)/home");
        return true;
      });

      return () => subscription.remove();
    }, [router]),
  );

  return <Stack screenOptions={{ headerShown: false }} />;
}
