import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import { ClipboardList } from "lucide-react-native";
import { getVault, setVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";

const DEFAULT_PROMPT = "Name two functions of the mitochondria.";
const DEFAULT_CORRECT_ANSWER =
  "Mitochondria produce ATP via cellular respiration, and they regulate cellular metabolism / signal apoptosis.";

export default function OnboardingAnswerKeyPage() {
  const [prompt, setPrompt] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [marks, setMarks] = useState("5");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.ANSWER_KEY);
    getVault().then((vault) => {
      if (vault?.answerKey) {
        setPrompt(vault.answerKey.prompt);
        setCorrectAnswer(vault.answerKey.correctAnswer);
        setMarks(vault.answerKey.marks.toString());
      }
    });
  }, []);

  async function onSubmit() {
    setError(null);
    const trimmedPrompt = prompt.trim();
    const trimmedAnswer = correctAnswer.trim();
    const marksNum = parseInt(marks, 10);
    
    if (!trimmedPrompt) {
      setError("Add a question prompt so the AI knows what to grade.");
      return;
    }
    if (!trimmedAnswer) {
      setError("Add the correct answer so the AI has something to compare against.");
      return;
    }
    if (isNaN(marksNum) || marksNum <= 0) {
      setError("Marks must be a positive whole number.");
      return;
    }
    
    await setVault({
      answerKey: {
        prompt: trimmedPrompt,
        correctAnswer: trimmedAnswer,
        marks: marksNum,
      },
    });
    router.push("/onboarding/upload");
  }

  return (
    <OnboardingShell step={3} backHref="/onboarding/capabilities">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="items-center mb-6">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper shadow-paper">
              <ClipboardList size={32} color="white" />
            </View>
            <Text className="text-center text-3xl font-semibold tracking-tight text-ink">
              First, give me the answer key for one question.
            </Text>
            <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
              This is what AI will grade against. The more specific, the better.
            </Text>
          </View>

          <View className="space-y-5 gap-4">
            <View>
              <Text className="text-sm font-semibold text-ink mb-1">Question prompt</Text>
              <Text className="text-xs text-ink-soft mb-2">What you asked the student.</Text>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder={DEFAULT_PROMPT}
                placeholderTextColor="#a3927b"
                className="rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-ink mb-1">Correct answer</Text>
              <Text className="text-xs text-ink-soft mb-2">The model answer. Be specific.</Text>
              <TextInput
                value={correctAnswer}
                onChangeText={setCorrectAnswer}
                placeholder={DEFAULT_CORRECT_ANSWER}
                placeholderTextColor="#a3927b"
                className="h-28 rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-ink mb-1">Marks</Text>
              <Text className="text-xs text-ink-soft mb-2">How much this question is worth.</Text>
              <TextInput
                value={marks}
                onChangeText={setMarks}
                keyboardType="numeric"
                className="w-32 rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink"
              />
            </View>

            {error ? (
              <View className="rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
                <Text className="text-sm text-pen-deep">{error}</Text>
              </View>
            ) : null}

            <View className="mt-4">
              <TouchableOpacity
                onPress={onSubmit}
                className="w-full items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper shadow-paper active:bg-pen-deep"
              >
                <Text className="text-base font-semibold text-white">Continue to upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}
