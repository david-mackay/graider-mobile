import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import SocialProofCard from "@/components/marketing/SocialProofCard";
import GradedQuestionBreakdown from "@/components/shared/GradedQuestionBreakdown";
import { Sparkles } from "lucide-react-native";
import { getVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";
import {
  normalizeStudents,
  onboardingGradeQuestions,
  type GradedOnboardingStudent,
} from "@/lib/onboarding/types";

export default function OnboardingResultPage() {
  const [students, setStudents] = useState<GradedOnboardingStudent[] | null>(null);

  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.FIRST_GRADE_RENDERED);
    getVault().then((vault) => {
      if (!vault) {
        router.replace("/onboarding/hook");
        return;
      }
      const graded = normalizeStudents(vault);
      if (graded.length === 0) {
        router.replace("/onboarding/upload");
        return;
      }
      setStudents(graded);
    });
  }, []);

  if (!students) {
    return (
      <OnboardingShell step={5} backHref="/onboarding/upload">
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color="#be3a2e" />
        </View>
      </OnboardingShell>
    );
  }

  const totalEarned = students.reduce((sum, s) => sum + s.grade.marksEarned, 0);
  const totalMax = students.reduce((sum, s) => sum + s.grade.maxMarks, 0);

  return (
    <OnboardingShell step={5} backHref="/onboarding/upload" backLabel="Edit class">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="mb-6 items-center">
          <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper shadow-paper">
            <Sparkles size={32} color="white" />
          </View>
          <Text className="text-center text-3xl font-semibold tracking-tight text-ink">
            Your class, graded
          </Text>
          <Text className="mt-2 text-center text-sm text-ink-soft">
            {students.length} student{students.length === 1 ? "" : "s"} · {totalEarned}/{totalMax} marks
            total
          </Text>
        </View>

        <View className="gap-4">
          {students.map((s) => (
            <View
              key={s.id}
              className="rounded-2xl border border-line bg-paper p-5 shadow-paper shadow-paper"
            >
              <View className="mb-4 flex-row items-center justify-between gap-4">
                <Text className="text-sm font-bold text-ink">{s.name}</Text>
                <Text className="text-2xl font-bold text-pen">
                  {s.grade.marksEarned}/{s.grade.maxMarks}
                </Text>
              </View>
              <GradedQuestionBreakdown questions={onboardingGradeQuestions(s.grade)} />
            </View>
          ))}

          <SocialProofCard />

          <View className="mt-2 items-center">
            <TouchableOpacity
              onPress={() => router.push("/onboarding/save")}
              className="w-full items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper shadow-paper active:bg-pen-deep"
            >
              <Text className="text-base font-semibold text-white">Save my class</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}
