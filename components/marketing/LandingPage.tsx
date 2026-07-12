import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import VaultResumeGate from "./VaultResumeGate";
import { useGraiderSignIn } from "@/lib/auth/use-graider-sign-in";

function GradedPaper() {
  return (
    <View className="relative mx-auto h-72 w-60" accessibilityElementsHidden>
      <View className="absolute inset-0 -rotate-6 rounded-lg border border-line bg-cream-deep shadow-paper" />
      <View className="absolute inset-0 rotate-3 rounded-lg border border-line bg-cream shadow-paper" />
      <View className="absolute inset-0 -rotate-1 overflow-hidden rounded-lg border border-line bg-paper shadow-card">
        <View className="flex-1 px-5 py-4">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-hand text-xl text-ink-soft">Maya P.</Text>
            <Text className="font-hand text-3xl font-bold text-pen" style={{ transform: [{ rotate: "-6deg" }] }}>
              9/10
            </Text>
          </View>
          <View className="mt-3 gap-3.5">
            {[true, true, false, true].map((correct, i) => (
              <View key={i} className="flex-row items-center gap-2">
                <Text className="font-hand text-base text-pen leading-none">{correct ? "✓" : "✗"}</Text>
                <View className="h-px flex-1 bg-line" />
              </View>
            ))}
          </View>
          <Text className="mt-auto font-hand text-lg leading-snug text-pen" style={{ transform: [{ rotate: "-1deg" }] }}>
            Lovely working on Q3 —{"\n"}watch the units!
          </Text>
        </View>
      </View>
    </View>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Snap the stack",
    note: "any phone camera works",
    desc: "Take photos of the whole pile of handwritten papers and drop them in. No scanner, no per-page fuss.",
  },
  {
    n: "02",
    title: "Names match themselves",
    note: "you just confirm",
    desc: "Graider reads each page, finds the student's name, and pairs it with your class roster. You confirm with one glance.",
  },
  {
    n: "03",
    title: "The red pen does the rest",
    note: "marks + feedback",
    desc: "Every answer is graded against your answer key, with per-question marks and feedback written like margin notes.",
  },
];

export default function LandingPage() {
  const { signIn, isSigningIn } = useGraiderSignIn({ redirectTo: "/(teacher)" });

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <VaultResumeGate />

        <View className="items-center px-6 pt-12 pb-16">
          <Text className="text-xs font-bold uppercase tracking-[0.22em] text-pen">
            For teachers who grade by hand
          </Text>
          <Text className="mt-4 text-center font-display text-5xl font-semibold leading-tight tracking-tight text-ink">
            The stack grades itself.
          </Text>
          <Text className="mt-6 max-w-md text-center text-lg leading-relaxed text-ink-soft">
            Photograph the pile of papers. Graider reads every page, matches it to a student, and marks it with
            feedback — in one pass.
          </Text>

          <View className="mt-9 w-full items-center gap-4">
            <Link href="/onboarding/hook" asChild>
              <Pressable className="w-full items-center rounded-full bg-pen px-8 py-3.5 shadow-lifted active:scale-[0.97]">
                <Text className="text-base font-bold text-white">Grade a sample paper</Text>
              </Pressable>
            </Link>
            <Pressable
              onPress={() => void signIn()}
              disabled={isSigningIn}
              className="py-1"
              accessibilityRole="button"
              accessibilityLabel="Sign in to your existing account"
            >
              {isSigningIn ? (
                <ActivityIndicator size="small" color="#6f6151" />
              ) : (
                <Text className="text-sm font-bold text-ink-soft underline decoration-line underline-offset-4">
                  I already have an account
                </Text>
              )}
            </Pressable>
            <Text className="text-xs text-ink-faint">Free to try — no card, no setup, two minutes.</Text>
          </View>

          <View className="mt-12">
            <GradedPaper />
          </View>
        </View>

        <View className="border-t border-line/70 bg-paper/60 px-6 py-16">
          <Text className="text-center text-xs font-bold uppercase tracking-[0.22em] text-ink-faint">
            How it works
          </Text>
          <View className="mt-10 gap-10">
            {STEPS.map((step) => (
              <View key={step.n}>
                <View className="flex-row items-baseline gap-3">
                  <Text className="font-display text-3xl font-semibold text-pen">{step.n}</Text>
                  <Text className="font-hand text-lg text-ink-faint">{step.note}</Text>
                </View>
                <Text className="mt-3 font-display text-xl font-semibold text-ink">{step.title}</Text>
                <Text className="mt-2 text-sm leading-relaxed text-ink-soft">{step.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-ink px-6 py-16">
          <Text className="text-center font-hand text-2xl text-gold">
            Sunday evening, 7pm. A stack of 28 papers.
          </Text>
          <Text className="mt-4 text-center font-display text-4xl font-semibold tracking-tight text-paper">
            Done before your coffee is.
          </Text>
          <Text className="mx-auto mt-4 max-w-md text-center text-base leading-relaxed text-paper/70">
            Set up a class, photograph the stack, and hand back marked papers with real feedback — tomorrow morning.
          </Text>
          <View className="mt-9 items-center">
            <Link href="/onboarding/hook" asChild>
              <Pressable className="items-center rounded-full bg-pen px-8 py-3.5 shadow-lifted active:scale-[0.97]">
                <Text className="text-base font-bold text-white">Try it on one paper</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
