import * as Updates from "expo-updates";
import { AppState, type AppStateStatus } from "react-native";

/** True when this build can receive EAS Update bundles (not Expo Go / dev client). */
export function otaUpdatesEnabled(): boolean {
  return !__DEV__ && Updates.isEnabled;
}

/**
 * Check expo.dev for a newer JS bundle and reload if one is available.
 * Safe to call on launch and when returning to foreground.
 */
export async function checkAndApplyOTAUpdate(): Promise<boolean> {
  if (!otaUpdatesEnabled()) return false;

  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return false;

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch (error) {
    console.warn("[updates] OTA check failed:", error);
    return false;
  }
}

/** Run OTA checks on mount and whenever the app becomes active. */
export function subscribeToOTAUpdates(onAppActive: () => void): () => void {
  const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "active") onAppActive();
  });
  return () => subscription.remove();
}

export function currentUpdateMetadata() {
  return {
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
