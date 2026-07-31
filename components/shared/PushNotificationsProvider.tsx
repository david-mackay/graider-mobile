import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import {
  isActionablePushData,
  parsePushNotificationData,
  pushResponseKey,
  registerForExpoPushToken,
  type PushNotificationData,
} from "@/lib/push-notifications";

function clearHandledNotificationResponse() {
  try {
    Notifications.clearLastNotificationResponse();
  } catch {
    // Older native builds may not expose this; ignore.
  }
}

function navigateFromPushData(
  router: ReturnType<typeof useRouter>,
  data: PushNotificationData,
) {
  if (!isActionablePushData(data)) {
    router.push("/(teacher)");
    return;
  }
  if (data.jobId) {
    router.push({ pathname: "/(teacher)/grade", params: { jobId: data.jobId } });
    return;
  }
  router.push("/(teacher)/grade");
}

/**
 * Registers Expo push tokens with the Graider API and handles notification taps.
 *
 * Push can arrive while the Clerk session is cold — we queue the deep link and
 * only navigate after sign-in, so we don't bounce `/(teacher)` ↔ `/` in a loop.
 */
export default function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const graiderFetch = useGraiderFetch();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const registeredTokenRef = useRef<string | null>(null);
  const pendingDataRef = useRef<PushNotificationData | null>(null);
  const handledResponseKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isSignedIn || !user) return;

    let cancelled = false;

    void (async () => {
      try {
        const rolePayload = await handleJson<{ user: { role: string } }>(
          await graiderFetch("/api/me/role", { cache: "no-store" }),
        );
        if (cancelled || rolePayload.user.role !== "teacher") return;

        const registration = await registerForExpoPushToken();
        if (cancelled || !registration.ok) {
          if (registration.ok === false && registration.reason === "error") {
            console.warn("[push] registration failed:", registration.message);
          }
          return;
        }

        if (registeredTokenRef.current === registration.expoPushToken) return;

        await handleJson(
          await graiderFetch("/api/me/push-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              expoPushToken: registration.expoPushToken,
              platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : null,
            }),
          }),
        );
        registeredTokenRef.current = registration.expoPushToken;
      } catch (error) {
        console.warn("[push] token sync failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [graiderFetch, isSignedIn, user?.id]);

  useEffect(() => {
    if (!isLoaded) return;

    const openFromResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const key = pushResponseKey(response);
      if (handledResponseKeysRef.current.has(key)) return;
      handledResponseKeysRef.current.add(key);

      const data = parsePushNotificationData(response.notification.request.content.data);
      if (!isActionablePushData(data)) return;

      if (!isSignedIn) {
        // Keep the deep link until Clerk finishes signing in.
        pendingDataRef.current = data;
        return;
      }

      pendingDataRef.current = null;
      navigateFromPushData(router, data);
      clearHandledNotificationResponse();
    };

    const last = Notifications.getLastNotificationResponse();
    openFromResponse(last);

    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    return () => subscription.remove();
  }, [isLoaded, isSignedIn, router]);

  // After a cold start sign-in, apply any deferred push deep link once.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const pending = pendingDataRef.current;
    if (!pending || !isActionablePushData(pending)) return;
    pendingDataRef.current = null;
    navigateFromPushData(router, pending);
    clearHandledNotificationResponse();
  }, [isLoaded, isSignedIn, router]);

  return children;
}
