import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { parsePushNotificationData, registerForExpoPushToken } from "@/lib/push-notifications";

function navigateFromPushData(
  router: ReturnType<typeof useRouter>,
  data: ReturnType<typeof parsePushNotificationData>,
) {
  if (data.type?.startsWith("grade_stack") || data.screen === "grade") {
    if (data.jobId) {
      router.push({ pathname: "/(teacher)/grade", params: { jobId: data.jobId } });
    } else {
      router.push("/(teacher)/grade");
    }
    return;
  }
  router.push("/(teacher)");
}

/**
 * Registers Expo push tokens with the Graider API and handles notification taps.
 * Teachers only — grading alerts are not relevant to student accounts.
 */
export default function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const graiderFetch = useGraiderFetch();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const registeredTokenRef = useRef<string | null>(null);

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
    const openFromResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = parsePushNotificationData(response.notification.request.content.data);
      navigateFromPushData(router, data);
    };

    const last = Notifications.getLastNotificationResponse();
    openFromResponse(last);

    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    return () => subscription.remove();
  }, [router]);

  return children;
}
