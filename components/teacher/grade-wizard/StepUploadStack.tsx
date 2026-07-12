import { View, Text, Image, TouchableOpacity } from "react-native";
import ImagePickerButton from "@/components/shared/ImagePickerButton";
import { useMemo, useState } from "react";
import { Card, btnPrimary, btnSecondary } from "@/components/shared/ui";
import {
  isAcceptedImageType,
  pickedImageKey,
  type PickedImage,
} from "@/lib/picked-image";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE_BYTES = 30 * 1024 * 1024; // 30MB

type StepUploadStackProps = {
  title: string;
  subtitle: string;
  onSubmit: (files: PickedImage[]) => void | Promise<void>;
  onBack: () => void;
  isBusy: boolean;
  errorMessage: string;
  onClearError: () => void;
};

export default function StepUploadStack({
  title,
  subtitle,
  onSubmit,
  onBack,
  isBusy,
  errorMessage,
  onClearError,
}: StepUploadStackProps) {
  const [staged, setStaged] = useState<PickedImage[]>([]);
  const [localError, setLocalError] = useState<string>("");

  const combinedError = errorMessage || localError;

  function clearErrors() {
    setLocalError("");
    if (errorMessage) onClearError();
  }

  function addFiles(incoming: PickedImage[]) {
    clearErrors();

    const accepted: PickedImage[] = [];
    const rejected: string[] = [];
    const oversized: string[] = [];
    for (const file of incoming) {
      if (!isAcceptedImageType(file)) {
        rejected.push(file.name);
        continue;
      }
      if (file.size > 0 && file.size > MAX_FILE_SIZE_BYTES) {
        oversized.push(file.name);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length > 0) {
      setLocalError(`These files are not JPG, PNG, or HEIC/HEIF: ${rejected.join(", ")}`);
    }
    if (oversized.length > 0) {
      setLocalError(`These files are too large (max 10MB each): ${oversized.join(", ")}`);
    }

    setStaged((prev) => {
      const remaining = MAX_IMAGES - prev.length;
      if (remaining <= 0) {
        setLocalError(`You can upload at most ${MAX_IMAGES} images at a time.`);
        return prev;
      }
      const toAdd = accepted.slice(0, remaining);
      if (accepted.length > toAdd.length) {
        setLocalError(`Only the first ${MAX_IMAGES} images were added.`);
      }
      const next = [...prev, ...toAdd];
      const totalSize = next.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > MAX_TOTAL_SIZE_BYTES) {
        setLocalError("Total upload is too large (max 30MB). Use fewer pages or smaller photos.");
        return prev;
      }
      return next;
    });
  }

  function removeStaged(index: number) {
    setStaged((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAll() {
    setStaged([]);
    clearErrors();
  }

  function handleSubmit() {
    if (staged.length === 0) {
      setLocalError("Add at least one image to continue.");
      return;
    }
    void onSubmit(staged);
  }

  const submitDisabled = useMemo(
    () => isBusy || staged.length === 0,
    [isBusy, staged.length],
  );

  return (
    <View className="gap-4">
      <Card className="border-line bg-cream/40">
        <View className="items-center">
          <Text className="rounded-full bg-pen px-3 py-1 text-xs font-semibold text-white">
            Batch Scan Mode
          </Text>
          <Text className="mt-3 text-center text-sm text-ink-soft">
            Capture the full stack for each student, then review matches before grading.
          </Text>
        </View>
      </Card>

      <Card>
        <View className="mb-4 flex-row flex-wrap items-baseline justify-between gap-2">
          <View>
            <Text className="text-base font-semibold text-ink">{title}</Text>
            <Text className="text-xs text-ink-soft">{subtitle}</Text>
          </View>
          <Text className="text-xs text-ink-faint">
            {staged.length} / {MAX_IMAGES} images
          </Text>
        </View>

        <View className="items-center justify-center rounded-xl border-2 border-dashed border-line bg-pen-wash/30 px-6 py-8">
          <Text className="text-sm font-semibold text-ink">
            Snap or upload stack photos
          </Text>
          <Text className="mt-1 text-xs text-ink-soft">
            JPG, PNG, or HEIC/HEIF. Up to {MAX_IMAGES} pages per stack.
          </Text>
          <View className="mt-4">
            <ImagePickerButton
              multiple={true}
              onFilesSelected={(files) => {
                if (files.length > 0) addFiles(files);
              }}
            />
          </View>
        </View>

        {combinedError ? (
          <View className="mt-3 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
            <Text className="text-sm text-pen-deep">{combinedError}</Text>
          </View>
        ) : null}

        {staged.length > 0 ? (
          <View className="mt-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Pages ready ({staged.length})
              </Text>
              <TouchableOpacity
                onPress={clearAll}
                className="rounded px-2 py-1"
                disabled={isBusy}
              >
                <Text className="text-xs font-medium text-ink-soft">Clear all</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {staged.map((file, index) => (
                <View
                  key={pickedImageKey(file, index)}
                  className="w-[47%] overflow-hidden rounded-lg border border-line bg-paper p-3"
                >
                  <View className="mb-2 rounded bg-pen-wash px-2 py-1">
                    <Text className="text-xs font-medium text-pen-deep">
                      Page {index + 1}
                    </Text>
                  </View>
                  <Image
                    source={{ uri: file.uri }}
                    className="mb-2 h-24 w-full rounded-md bg-cream"
                    resizeMode="cover"
                  />
                  <Text className="mb-2 text-xs text-ink-soft" numberOfLines={1}>
                    {file.name}
                  </Text>
                  <View className="flex-row items-center justify-end">
                    <TouchableOpacity
                      onPress={() => removeStaged(index)}
                      disabled={isBusy}
                      className="rounded-full bg-paper/90 px-2 py-1"
                    >
                      <Text className="text-xs font-semibold text-ink">Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <TouchableOpacity
          onPress={onBack}
          disabled={isBusy}
          className={btnSecondary}
        >
          <Text className="text-sm font-medium text-pen-deep">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitDisabled}
          className={btnPrimary}
        >
          <Text className="text-sm font-semibold text-white">
            {isBusy ? "Queueing and reading pages…" : "Continue to review"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
