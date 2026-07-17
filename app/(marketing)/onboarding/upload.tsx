import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import { router } from "expo-router";
import * as FileSystem from 'expo-file-system/legacy';
import OnboardingShell from "@/components/marketing/OnboardingShell";
import ImagePickerButton from "@/components/shared/ImagePickerButton";
import { ClipboardType, X } from "lucide-react-native";
import { getVault, setVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";
import { hasAnswerKey } from "@/lib/onboarding/types";
import type { PickedImage } from "@/lib/picked-image";

const MAX_BYTES = 8 * 1024 * 1024;

export default function OnboardingUploadPage() {
  const [file, setFile] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.PAPER_UPLOAD);
    void getVault().then((vault) => {
      if (!hasAnswerKey(vault)) {
        router.replace("/onboarding/answer-key");
      }
    });
  }, []);

  function pickFile(files: PickedImage[]) {
    setError(null);
    if (!files || files.length === 0) {
      setFile(null);
      return;
    }
    const next = files[0];
    if (next.size > MAX_BYTES) {
      setError("Image must be under 8 MB.");
      return;
    }
    setFile(next);
  }

  async function onContinue() {
    if (!file) return;
    setIsBusy(true);
    setError(null);
    try {
      // Copy the image to a persistent app directory so we can read it later
      const destDir = `${FileSystem.documentDirectory}onboarding/`;
      const dirInfo = await FileSystem.getInfoAsync(destDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      }
      const destPath = `${destDir}student_paper_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: file.uri, to: destPath });

      await setVault({
        studentPaper: {
          mimeType: file.type || "image/jpeg",
          base64: "", // We store the URI instead of a massive base64 string
          fileUri: destPath,
          filename: file.name,
        },
        sampleGrade: undefined,
      });
      router.push("/onboarding/result");
    } catch (err) {
      console.error('[upload] onContinue error:', err);
      setError(err instanceof Error ? err.message : "Could not read the image.");
      setIsBusy(false);
    }
  }

  return (
    <OnboardingShell step={4} backHref="/onboarding/answer-key">
      <View className="items-center">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper shadow-paper">
          <ClipboardType size={32} color="white" />
        </View>
        <Text className="text-center font-display text-3xl font-semibold tracking-tight text-ink">
          Now snap one student&apos;s paper from the pile.
        </Text>
        <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
          Same move as the full app — camera or photo library. We&apos;ll mark it against the key you
          just set.
        </Text>
      </View>

      <View className="mt-8 flex-1">
        {file ? (
          <View className="items-center">
            <Image 
              source={{ uri: file.uri }} 
              className="h-64 w-full rounded-2xl border border-line bg-cream"
              resizeMode="contain"
            />
            
            <View className="mt-4 w-full flex-row items-center justify-between rounded-2xl border border-line bg-paper p-4 shadow-paper shadow-paper">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
                  {file.name}
                </Text>
                <Text className="text-xs text-ink-faint">
                  {(file.size / 1024).toFixed(0)} KB · {file.type || "image/jpeg"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFile(null)}
                className="ml-4 rounded-full bg-pen-wash p-2"
              >
                <X size={16} color="#be3a2e" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-center rounded-3xl border-2 border-dashed border-line bg-paper px-4 py-8">
            <ImagePickerButton 
              onFilesSelected={pickFile} 
              multiple={false}
            />
          </View>
        )}

        {error ? (
          <View className="mt-4 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
            <Text className="text-sm text-pen-deep">{error}</Text>
          </View>
        ) : null}

        <View className="mt-auto pt-6 pb-2">
          <TouchableOpacity
            onPress={onContinue}
            disabled={!file || isBusy}
            className={`w-full items-center justify-center rounded-full px-8 py-4 shadow-paper shadow-paper ${!file || isBusy ? 'bg-pen-soft' : 'bg-pen active:bg-pen-deep'}`}
          >
            <Text className="text-base font-semibold text-white">
              {isBusy ? "Reading..." : "Grade this paper"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </OnboardingShell>
  );
}
