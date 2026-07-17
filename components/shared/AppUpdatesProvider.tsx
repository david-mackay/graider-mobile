import { useEffect, useRef } from "react";
import { Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  decideStoreUpdate,
  fetchAppVersionPolicy,
  getNativeAppIdentity,
} from "@/lib/app-version";
import { checkAndApplyOTAUpdate, subscribeToOTAUpdates } from "@/lib/ota-updates";

const SOFT_UPDATE_KEY = "graider.soft_store_update_dismissed";

async function openStoreUrl(storeUrl: string) {
  if (!storeUrl) {
    Alert.alert(
      "Update available",
      "Please update Graider from the App Store or Google Play.",
    );
    return;
  }
  try {
    await Linking.openURL(storeUrl);
  } catch {
    Alert.alert("Could not open store", "Search for Graider in the App Store or Google Play.");
  }
}

async function checkStoreUpdateRequired(): Promise<"force" | "soft" | "ok"> {
  const apiBase = process.env.EXPO_PUBLIC_APP_URL;
  if (!apiBase) return "ok";

  const policy = await fetchAppVersionPolicy(apiBase);
  if (!policy) return "ok";

  const identity = getNativeAppIdentity();
  const decision = decideStoreUpdate(identity, policy);

  if (decision.kind === "force") {
    Alert.alert(
      "Update required",
      `This version of Graider is no longer supported. Please update to ${decision.minVersion} or newer from the store to continue.`,
      [
        {
          text: "Update",
          onPress: () => {
            void openStoreUrl(decision.storeUrl);
          },
        },
      ],
      { cancelable: false },
    );
    return "force";
  }

  if (decision.kind === "soft") {
    const dismissedFor = await AsyncStorage.getItem(SOFT_UPDATE_KEY);
    if (dismissedFor === decision.latestVersion) return "soft";

    Alert.alert(
      "Update available",
      `A newer version of Graider (${decision.latestVersion}) is available on the store. OTA fixes still apply on this build when possible.`,
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: () => {
            void AsyncStorage.setItem(SOFT_UPDATE_KEY, decision.latestVersion);
          },
        },
        {
          text: "Update",
          onPress: () => {
            void openStoreUrl(decision.storeUrl);
          },
        },
      ],
    );
    return "soft";
  }

  return "ok";
}

/**
 * Store version gates + EAS Update OTA.
 * Force store updates block OTA (binary is too old for the new runtime).
 * Soft prompts never block OTA.
 */
export default function AppUpdatesProvider({ children }: { children: React.ReactNode }) {
  const checkingRef = useRef(false);

  useEffect(() => {
    async function runChecks() {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const store = await checkStoreUpdateRequired();
        // Don't bother fetching OTA if the binary itself is below minVersion —
        // runtimeVersion won't match newer bundles anyway.
        if (store !== "force") {
          await checkAndApplyOTAUpdate();
        }
      } finally {
        checkingRef.current = false;
      }
    }

    void runChecks();
    return subscribeToOTAUpdates(() => {
      void runChecks();
    });
  }, []);

  return children;
}
