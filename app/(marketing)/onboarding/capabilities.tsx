import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import { Sparkles } from "lucide-react-native";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";

type Capability = {
  verb: string;
  example: string;
};

const CAPABILITIES: Capability[] = [
  {
    verb: "Import",
    example:
      "Upload your test and answer bank. Questions and the key land automatically — you are not rebuilding the paper from scratch.",
  },
  {
    verb: "Grade your way",
    example:
      "Every mark is checked against your rubric and answer key. Reliable grading, not an AI giving its opinions.",
  },
  {
    verb: "Hand it back",
    example:
      "Toggle feedback on or off, share a PDF immediately, or email results with each student's address already filled in.",
  },
];

export default function OnboardingCapabilitiesPage() {
  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.CAPABILITIES);
  }, []);

  return (
    <OnboardingShell step={2} backHref="/onboarding/hook">
      <View className="items-center">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper">
          <Sparkles size={32} color="white" />
        </View>
        <Text className="text-center font-display text-3xl font-semibold tracking-tight text-ink">
          That&apos;s where <Text className="font-bold text-pen">graider</Text> comes in.
        </Text>
        <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
          Bring the test you already wrote. Grade against the key you trust. Hand papers back tonight.
        </Text>
      </View>

      <View className="mt-8 gap-4">
        {CAPABILITIES.map((cap, index) => (
          <View key={cap.verb} className="rounded-2xl border border-line bg-paper p-4 shadow-paper">
            <View className="flex-row items-start gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-pen-wash">
                <Text className="font-display text-lg font-semibold text-pen">
                  {String(index + 1).padStart(2, "0")}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-display text-base font-semibold text-ink">{cap.verb}</Text>
                <Text className="mt-1 text-sm leading-relaxed text-ink-soft">{cap.example}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-10 items-center">
        <TouchableOpacity
          onPress={() => router.push("/onboarding/answer-key")}
          className="w-full items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper active:bg-pen-deep"
        >
          <Text className="text-base font-semibold text-white">Try it on one paper</Text>
        </TouchableOpacity>
        <Text className="mt-3 text-center text-xs text-ink-faint">
          No sign up — we&apos;ll grade a single paper for you.
        </Text>
      </View>
    </OnboardingShell>
  );
}
