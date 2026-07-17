import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark, Wordmark } from "@/components/shared/Brand";
import { formatAppVersionLabel, getNativeAppIdentity } from "@/lib/app-version";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { handleJson } from "@/lib/dashboard-client";

type AccountSettingsViewProps = {
  backHref: "/(teacher)" | "/(student)";
};

export default function AccountSettingsView({ backHref }: AccountSettingsViewProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const graiderFetch = useGraiderFetch();
  const [busy, setBusy] = useState(false);
  const versionIdentity = getNativeAppIdentity();
  const versionLabel = formatAppVersionLabel(versionIdentity);

  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Your account";

  const onSignOut = useCallback(async () => {
    setBusy(true);
    try {
      await signOut();
      // Reset to the marketing landing — teacher/student layouts also
      // redirect when signed out, but replace("/") is the explicit home.
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/");
    } catch (error) {
      Alert.alert("Sign out failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }, [router, signOut]);

  const performDelete = useCallback(async () => {
    setBusy(true);
    try {
      await handleJson<{ ok: boolean }>(
        await graiderFetch("/api/me", { method: "DELETE" }),
      );
      await signOut();
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Could not delete account",
        error instanceof Error ? error.message : "Try again or contact support.",
      );
    } finally {
      setBusy(false);
    }
  }, [graiderFetch, router, signOut]);

  const onDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your Graider account, classes you own, grading history, and related data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () => {
            Alert.alert("Confirm deletion", "Are you sure? Your data will be erased immediately.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete my account", style: "destructive", onPress: () => void performDelete() },
            ]);
          },
        },
      ],
    );
  }, [performDelete]);

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: Math.max(insets.top, 12) }}>
      <View className="flex-row items-center justify-between border-b border-line bg-paper px-4 py-3">
        <Pressable
          onPress={() => router.replace(backHref)}
          disabled={busy}
          className="rounded-full px-3 py-2"
        >
          <Text className="text-sm font-bold text-pen">Back</Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <BrandMark className="h-7 w-7" />
          <Wordmark className="text-base" />
        </View>
        <View className="w-14" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}
      >
        <Text className="font-display text-2xl font-semibold text-ink">Account</Text>
        <Text className="mt-2 text-sm leading-relaxed text-ink-soft">{displayName}</Text>

        <View className="mt-8 rounded-2xl border border-line bg-paper p-4">
          <Text className="text-xs font-bold uppercase tracking-wide text-ink-faint">Session</Text>
          <Pressable
            onPress={() => void onSignOut()}
            disabled={busy}
            className="mt-3 items-center rounded-full border border-line bg-cream px-5 py-3.5 active:opacity-80"
          >
            {busy ? (
              <ActivityIndicator color="#be3a2e" />
            ) : (
              <Text className="text-sm font-bold text-ink">Sign out</Text>
            )}
          </Pressable>
        </View>

        <View className="mt-6 rounded-2xl border border-pen-soft/40 bg-paper p-4">
          <Text className="text-xs font-bold uppercase tracking-wide text-pen">Danger zone</Text>
          <Text className="mt-2 text-sm leading-relaxed text-ink-soft">
            Delete your account and all associated Graider data. Required so you can leave the
            service permanently.
          </Text>
          <Pressable
            onPress={onDeleteAccount}
            disabled={busy}
            className="mt-4 items-center rounded-full bg-pen px-5 py-3.5 active:opacity-80"
          >
            <Text className="text-sm font-bold text-white">Delete account</Text>
          </Pressable>
        </View>

        <View className="mt-10 items-center gap-1">
          <Text className="text-xs text-ink-faint">Graider {versionLabel}</Text>
          {versionIdentity.channel ? (
            <Text className="text-[10px] text-ink-faint">
              channel {versionIdentity.channel}
              {versionIdentity.runtimeVersion
                ? ` · runtime ${versionIdentity.runtimeVersion}`
                : ""}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
