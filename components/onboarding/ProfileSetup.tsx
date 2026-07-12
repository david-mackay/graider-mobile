import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, FormField, btnPrimary, inputClass } from "@/components/shared/ui";
import { BrandMark, Wordmark } from "@/components/shared/Brand";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { AppRole } from "@/lib/types";

type ProfileSetupProps = {
  initialName?: string;
  initialRole: AppRole;
  onComplete: (data: { full_name: string; role: AppRole }) => void | Promise<void>;
};

export default function ProfileSetup({ initialName = "", initialRole, onComplete }: ProfileSetupProps) {
  const graiderFetch = useGraiderFetch();
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<AppRole>(initialRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await handleJson(
        await graiderFetch("/api/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: name }),
        }),
      );
      await handleJson(
        await graiderFetch("/api/me/role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }),
      );
      await onComplete({ full_name: name, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  const roleOption = (value: AppRole, label: string, sub: string) => (
    <TouchableOpacity
      onPress={() => setRole(value)}
      className={`flex-1 rounded-2xl border-2 px-4 py-3 ${
        role === value ? "border-pen bg-pen-wash" : "border-line bg-paper"
      }`}
    >
      <Text className={`text-sm font-bold ${role === value ? "text-pen-deep" : "text-ink"}`}>{label}</Text>
      <Text className="mt-0.5 text-xs text-ink-faint">{sub}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-cream px-4">
      <View className="w-full max-w-md animate-rise">
        <Card>
          <View className="mb-6 items-center">
            <View className="mb-4">
              <BrandMark className="h-14 w-14" />
            </View>
            <Text className="font-display text-2xl font-semibold text-ink">
              Welcome to <Wordmark className="text-[1em]" />
            </Text>
            <Text className="mt-1 text-sm text-ink-soft">How should we write your name on the papers?</Text>
          </View>
          <View className="gap-4">
            <FormField label="Your name">
              <TextInput
                className={inputClass}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Jane Smith"
                autoFocus
              />
            </FormField>
            <FormField label="I am a…">
              <View className="flex-row gap-3">
                {roleOption("teacher", "Teacher", "Grade stacks of papers")}
                {roleOption("student", "Student", "View released grades")}
              </View>
            </FormField>
            {error ? <Text className="text-xs font-bold text-pen-deep">{error}</Text> : null}
            <TouchableOpacity
              disabled={busy || !name.trim()}
              className={`${btnPrimary} w-full justify-center py-3`}
              onPress={submit}
            >
              <Text className="font-bold text-white">{busy ? "Saving…" : "Continue"}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}
