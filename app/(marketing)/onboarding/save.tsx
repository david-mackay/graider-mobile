import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import AuthMethodPanel from "@/components/shared/AuthMethodPanel";
import { Sparkles } from "lucide-react-native";
import { getResumeStep, getVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";
import { normalizeStudents, type GradedOnboardingStudent } from "@/lib/onboarding/types";

export default function OnboardingSavePage() {
  const [students, setStudents] = useState<GradedOnboardingStudent[] | null>(null);

  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.SAVE_PROGRESS);
    getVault().then((vault) => {
      if (!vault) {
        router.replace("/onboarding/hook");
        return;
      }
      const graded = normalizeStudents(vault);
      if (graded.length === 0) {
        const step = getResumeStep(vault);
        router.replace(`/onboarding/${step}` as never);
        return;
      }
      setStudents(graded);
    });
  }, []);

  if (!students) {
    return (
      <OnboardingShell step={6} backHref="/onboarding/result">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#be3a2e" />
        </View>
      </OnboardingShell>
    );
  }

  const totalEarned = students.reduce((sum, s) => sum + s.grade.marksEarned, 0);
  const totalMax = students.reduce((sum, s) => sum + s.grade.maxMarks, 0);

  return (
    <OnboardingShell step={6} backHref="/onboarding/result">
      <View className="items-center">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper">
          <Sparkles size={32} color="white" />
        </View>
        <Text className="text-center text-3xl font-semibold tracking-tight text-ink">
          Save your graded class
        </Text>
        <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
          Don&apos;t lose this — sign up with email, Google, or Apple to keep your progress.
        </Text>
      </View>

      <View className="mt-8 gap-4">
        <View className="rounded-2xl border border-line bg-paper p-5 shadow-paper">
          <Text className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
            {students.length} student{students.length === 1 ? "" : "s"} graded
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-baseline gap-1">
              <Text className="text-4xl font-semibold text-pen">{totalEarned}</Text>
              <Text className="text-lg font-semibold text-ink-faint">/ {totalMax}</Text>
            </View>
            <View className="rounded-full border border-moss/30 bg-moss-wash px-2.5 py-0.5">
              <Text className="text-xs font-medium text-moss-deep">Graded</Text>
            </View>
          </View>
        </View>

        <View className="pt-2">
          <AuthMethodPanel
            redirectTo="/onboarding-sync"
            intent="sign-up"
            onStarted={() => fireEvent(ONBOARDING_EVENTS.AUTH_STARTED)}
          />
        </View>
      </View>
    </OnboardingShell>
  );
}
