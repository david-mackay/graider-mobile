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
    title: "Drop in your test",
    note: "answer bank included",
    desc: "Upload the test and your answer key. Graider pulls questions and the bank automatically — no retyping the whole paper by hand.",
  },
  {
    n: "02",
    title: "Grade against your rubric",
    note: "your standards, not AI vibes",
    desc: "Marks and feedback come from the key and rubric you provide. This is not an LLM freestyling opinions about student work.",
  },
  {
    n: "03",
    title: "Snap the stack",
    note: "camera or photo library",
    desc: "Photograph the pile. Graider matches pages to students on your roster. You confirm once, then it grades the lot.",
  },
  {
    n: "04",
    title: "Hand it back your way",
    note: "PDF, email, your call",
    desc: "Toggle feedback on or off before you release. Share a marked PDF immediately, or email results with each student's address already filled in.",
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
            Upload your test and answer key, photograph the stack, and get marks against{" "}
            <Text className="font-semibold text-ink">your</Text> rubric — then hand back a PDF or
            email with feedback you control.
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
          <Text className="mt-4 text-center font-display text-3xl font-semibold tracking-tight text-ink">
            Your key. Your stack. Their marked papers — tonight.
          </Text>
          <Text className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-ink-soft">
            Built for teachers who already know how they want work marked, and just need the Sunday pile gone.
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
            Import your test, grade against your rubric, then toggle feedback and send the PDF — or email
            each student with their address already filled in.
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
