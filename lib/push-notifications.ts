import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type PushRegistrationResult =
  | { ok: true; expoPushToken: string }
  | { ok: false; reason: "simulator" | "denied" | "unavailable" | "error"; message?: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getEasProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Request permission and return an Expo push token for physical devices. */
export async function registerForExpoPushToken(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { ok: false, reason: "simulator" };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Graider",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    return { ok: false, reason: "unavailable", message: "Missing EAS projectId in app config." };
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return { ok: true, expoPushToken: token.data };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      message: error instanceof Error ? error.message : "Failed to get push token.",
    };
  }
}

/** Actionable pushes only — failures are not sent from the API. */
export type PushNotificationData = {
  type?: "grade_stack_preview" | "grade_stack_commit";
  jobId?: string;
  screen?: string;
};

export function parsePushNotificationData(data: unknown): PushNotificationData {
  if (!data || typeof data !== "object") return {};
  const record = data as Record<string, unknown>;
  return {
    type:
      record.type === "grade_stack_preview" || record.type === "grade_stack_commit"
        ? record.type
        : undefined,
    jobId: typeof record.jobId === "string" ? record.jobId : undefined,
    screen: typeof record.screen === "string" ? record.screen : undefined,
  };
}

export function pushResponseKey(response: Notifications.NotificationResponse): string {
  return `${response.notification.request.identifier}:${response.actionIdentifier}`;
}

/** True when this push has somewhere useful to land (review or results). */
export function isActionablePushData(data: PushNotificationData): boolean {
  if (data.type === "grade_stack_preview" || data.type === "grade_stack_commit") {
    return Boolean(data.jobId);
  }
  return false;
}
