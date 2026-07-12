import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import { Sparkles } from "lucide-react-native";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";

type Capability = {
  emoji: string;
  verb: string;
  example: string;
};

const CAPABILITIES: Capability[] = [
  {
    emoji: "📸",
    verb: "Scan",
    example: "Snap a photo of Maya's handwritten test.",
  },
  {
    emoji: "⚡",
    verb: "Grade",
    example:
      "AI compares her answer to your key — 7/10, 'Missed the second mitochondria function.'",
  },
  {
    emoji: "📊",
    verb: "Review",
    example: "See exactly where the class struggled before next lesson.",
  },
];

export default function OnboardingCapabilitiesPage() {
  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.CAPABILITIES);
  }, []);

  return (
    <OnboardingShell step={2} backHref="/onboarding/hook">
      <View className="items-center">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper shadow-paper">
          <Sparkles size={32} color="white" />
        </View>
        <Text className="text-center text-3xl font-semibold tracking-tight text-ink">
          That's where{" "}
          <Text className="text-pen font-black">graider</Text> comes in.
        </Text>
        <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
          Three things it does in the background while you teach.
        </Text>
      </View>

      <View className="mt-8 gap-4">
        {CAPABILITIES.map((cap) => (
          <View key={cap.verb} className="rounded-2xl border border-line bg-paper p-4 shadow-paper shadow-paper">
            <View className="flex-row items-start gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-pen-wash">
                <Text className="text-2xl">{cap.emoji}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">
                  {cap.verb}
                </Text>
                <Text className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {cap.example}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-10 items-center">
        <TouchableOpacity
          onPress={() => router.push("/onboarding/answer-key")}
          className="w-full items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper shadow-paper active:bg-pen-deep"
        >
          <Text className="text-base font-semibold text-white">Try it on one paper</Text>
        </TouchableOpacity>
        <Text className="mt-3 text-center text-xs text-ink-faint">
          No sign up — we'll grade a single paper for you.
        </Text>
      </View>
    </OnboardingShell>
  );
}
