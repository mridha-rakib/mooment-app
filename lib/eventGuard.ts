import { Alert } from "react-native";
import type { Router } from "expo-router";
import type { AuthUser, UpdateProfilePayload } from "@/stores/authStore";

type GuardParams = {
  user: AuthUser | null;
  completedProfileTypes: ("personal" | "business")[];
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  router: Router;
  onReady: () => void | Promise<void>;
};

/**
 * Ensures the current user is on a Business Account before proceeding.
 *
 * - Already business → calls onReady immediately.
 * - Personal but business profile exists → prompts to switch, then calls onReady.
 * - No business profile yet → prompts to set one up first.
 */
export const requireBusinessAccountForEvent = ({
  user,
  completedProfileTypes,
  updateProfile,
  router,
  onReady,
}: GuardParams): void => {
  if (!user) return;

  if (user.accountType === "business") {
    void onReady();
    return;
  }

  if (completedProfileTypes.includes("business")) {
    Alert.alert(
      "Business Account Required",
      "Events can only be created and managed from a Business Account. Switch to your Business Account now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch Account",
          onPress: async () => {
            try {
              await updateProfile({ accountType: "business" });
              await onReady();
            } catch {
              Alert.alert("Switch Failed", "Unable to switch account. Please try again.");
            }
          },
        },
      ],
    );
  } else {
    Alert.alert(
      "Business Account Required",
      "Events can only be created and managed from a Business Account. Set up your Business Account first.",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Set Up Business Account",
          onPress: () => {
            router.push({
              pathname: "/profile-screen/edit-profile",
              params: { type: "business", mode: "switch" },
            });
          },
        },
      ],
    );
  }
};
