import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { clearVault, getVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { OnboardingSyncResponse } from "@/lib/types";

type SyncState =
  | { kind: "loading" }
  | { kind: "redirecting" }
  | { kind: "error"; message: string };

export default function OnboardingSyncPage() {
  const graiderFetch = useGraiderFetch();
  const [state, setState] = useState<SyncState>({ kind: "loading" });
  const ranRef = useRef(false);

  async function runSync() {
    setState({ kind: "loading" });
    const vault = await getVault();
    if (!vault || !vault.sampleGrade) {
      setState({ kind: "redirecting" });
      router.replace("/(teacher)/grade");
      return;
    }

    try {
      const res = await graiderFetch("/api/onboarding/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vault),
      });
      const payload = (await res.json()) as OnboardingSyncResponse & { error?: string };
      if (!res.ok) {
        setState({
          kind: "error",
          message: payload.error ?? "We couldn't save your first graded test. Try again.",
        });
        return;
      }
      fireEvent(ONBOARDING_EVENTS.CLASS_SYNCED, { created: payload.created });
      await clearVault();
      setState({ kind: "redirecting" });
      // In mobile, we route to teacher grade tab
      router.replace("/(teacher)/grade");
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error — please try again.",
      });
    }
  }

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    fireEvent(ONBOARDING_EVENTS.AUTH_COMPLETE);
    runSync();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-paper">
          <View className="items-center">
            <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-pen shadow-paper shadow-paper">
              <Sparkles size={28} color="white" />
            </View>

            {state.kind === "loading" || state.kind === "redirecting" ? (
              <View className="items-center">
                <Text className="text-lg font-bold text-ink">
                  Saving your first graded test...
                </Text>
                <Text className="mt-2 text-center text-sm text-ink-soft">
                  Setting up your starter class and seeding the sample grade.
                </Text>
                <View className="mt-6">
                  <ActivityIndicator size="large" color="#be3a2e" />
                </View>
              </View>
            ) : null}

            {state.kind === "error" ? (
              <View className="items-center">
                <Text className="text-lg font-bold text-ink">Something went wrong</Text>
                <Text className="mt-2 text-center text-sm text-pen-deep">{state.message}</Text>
                <View className="mt-5 w-full flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => router.push("/(teacher)/grade")}
                    className="flex-1 items-center justify-center rounded-2xl bg-paper border border-line py-3"
                  >
                    <Text className="text-sm font-semibold text-ink">Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={runSync}
                    className="flex-1 items-center justify-center rounded-full bg-pen py-3"
                  >
                    <Text className="text-sm font-semibold text-white">Try Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
