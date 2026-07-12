import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";

export default function OnboardingHookPage() {
  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.EMOTIONAL_HOOK);
  }, []);

  return (
    <OnboardingShell step={1}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-center font-hand text-2xl text-pen">Sunday, 7:42pm</Text>

        <Text className="mt-4 text-center font-display text-4xl font-semibold leading-tight tracking-tight text-ink">
          You're a great teacher. The stack of papers just gets in the way.
        </Text>

        <Text className="mt-6 max-w-md text-center text-base leading-relaxed text-ink-soft">
          You spend evenings grading. Not because you don't care about your students — because grading 30
          papers takes 3 hours.
        </Text>

        <View className="mt-10 w-full">
          <TouchableOpacity
            onPress={() => router.push("/onboarding/capabilities")}
            className="w-full items-center justify-center rounded-full bg-pen px-8 py-3.5 shadow-lifted active:bg-pen-deep"
          >
            <Text className="text-base font-bold text-white">Show me how</Text>
          </TouchableOpacity>
        </View>

        <Text className="mt-4 text-center text-xs text-ink-faint">Takes about 60 seconds</Text>
      </View>
    </OnboardingShell>
  );
}
