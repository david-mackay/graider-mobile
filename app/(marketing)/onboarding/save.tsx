import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import { Sparkles } from "lucide-react-native";
import { getResumeStep, getVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";
import { useGraiderSignIn } from "@/lib/auth/use-graider-sign-in";
import type { OnboardingSampleGrade } from "@/lib/types";

export default function OnboardingSavePage() {
  const [grade, setGrade] = useState<OnboardingSampleGrade | null>(null);
  const { signIn, isSigningIn } = useGraiderSignIn({
    redirectTo: "/onboarding-sync",
    onStarted: () => fireEvent(ONBOARDING_EVENTS.AUTH_STARTED),
  });

  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.SAVE_PROGRESS);
    getVault().then((vault) => {
      if (!vault) {
        router.replace("/onboarding/hook");
        return;
      }
      if (!vault.sampleGrade) {
        const step = getResumeStep(vault);
        router.replace(`/onboarding/${step}`);
        return;
      }
      setGrade(vault.sampleGrade as any);
    });
  }, []);

  const onSignIn = async () => {
    try {
      await signIn();
    } catch {
      router.replace("/onboarding-sync");
    }
  };

  if (!grade) {
    return (
      <OnboardingShell step={6} backHref="/onboarding/result">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#be3a2e" />
        </View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step={6} backHref="/onboarding/result">
      <View className="items-center">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper shadow-paper">
          <Sparkles size={32} color="white" />
        </View>
        <Text className="text-center text-3xl font-semibold tracking-tight text-ink">
          Save your first graded test
        </Text>
        <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
          Don't lose this — sign up to keep your progress and start grading real stacks.
        </Text>
      </View>

      <View className="mt-8 gap-4">
        <View className="rounded-2xl border border-line bg-paper p-5 shadow-paper shadow-paper">
          <Text className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
            Your sample grade
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-baseline gap-1">
              <Text className="text-4xl font-semibold text-pen">{grade.marksEarned}</Text>
              <Text className="text-lg font-semibold text-ink-faint">/ {grade.maxMarks}</Text>
            </View>
            <View className="rounded-full bg-moss-wash px-2.5 py-0.5 border border-moss/30">
              <Text className="text-xs font-medium text-moss-deep">Graded</Text>
            </View>
          </View>
          {grade.feedback ? (
            <Text className="mt-3 text-sm leading-relaxed text-ink">{grade.feedback}</Text>
          ) : null}
        </View>

        <View className="pt-4 items-center">
          <TouchableOpacity
            onPress={onSignIn}
            disabled={isSigningIn}
            className="w-full items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper shadow-paper active:bg-pen-deep"
          >
            {isSigningIn ? (
              <ActivityIndicator color="#fffcf5" />
            ) : (
              <Text className="text-base font-semibold text-white">Save my progress — sign up free</Text>
            )}
          </TouchableOpacity>
          <View className="mt-4 flex-row items-center">
            <Text className="text-xs text-ink-faint">Already have an account? </Text>
            <TouchableOpacity onPress={onSignIn}>
              <Text className="text-xs font-semibold text-pen">Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
}
