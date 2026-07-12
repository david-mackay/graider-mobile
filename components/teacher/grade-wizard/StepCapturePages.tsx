import { View, Text, Image, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronUp, ChevronDown, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { Card } from "@/components/shared/ui";
import { assetToPickedImage, isAcceptedImageType, pickedImageKey, type PickedImage } from "@/lib/picked-image";
import { MAX_PAGES_PER_STUDENT } from "@/lib/student-grade";

type StepCapturePagesProps = {
  studentName: string;
  pages: PickedImage[];
  onAddPage: (page: PickedImage) => void;
  onRemovePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onDone: () => void;
  onBack: () => void;
  errorMessage: string;
};

function acceptedPages(assets: ImagePicker.ImagePickerAsset[]): PickedImage[] {
  const pages: PickedImage[] = [];
  const rejected: string[] = [];
  for (const asset of assets) {
    const picked = assetToPickedImage(asset);
    if (isAcceptedImageType(picked)) {
      pages.push(picked);
    } else {
      rejected.push(picked.name);
    }
  }
  if (pages.length === 0) {
    Alert.alert("Unsupported format", "Use JPG, PNG, or HEIC photos.");
    return [];
  }
  if (rejected.length > 0) {
    Alert.alert(
      "Some photos skipped",
      `${rejected.length} file${rejected.length === 1 ? "" : "s"} had an unsupported format.`,
    );
  }
  return pages;
}

async function snapPhoto(): Promise<PickedImage | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Camera access needed", "Allow camera access in Settings to photograph test pages.");
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });

  if (result.canceled || result.assets.length === 0) return null;
  const pages = acceptedPages(result.assets);
  return pages[0] ?? null;
}

async function pickPhotosFromLibrary(maxCount: number): Promise<PickedImage[]> {
  if (maxCount <= 0) {
    Alert.alert("Page limit", `Maximum ${MAX_PAGES_PER_STUDENT} pages per student.`);
    return [];
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Photo access needed", "Allow photo library access in Settings to upload test pages.");
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: maxCount > 1,
    selectionLimit: maxCount,
    quality: 0.85,
  });

  if (result.canceled || result.assets.length === 0) return [];
  return acceptedPages(result.assets).slice(0, maxCount);
}

export default function StepCapturePages({
  studentName,
  pages,
  onAddPage,
  onRemovePage,
  onMovePage,
  onDone,
  onBack,
  errorMessage,
}: StepCapturePagesProps) {
  const insets = useSafeAreaInsets();

  const remainingSlots = MAX_PAGES_PER_STUDENT - pages.length;

  const handleSnap = useCallback(async () => {
    if (remainingSlots <= 0) {
      Alert.alert("Page limit", `Maximum ${MAX_PAGES_PER_STUDENT} pages per student.`);
      return;
    }
    const photo = await snapPhoto();
    if (photo) onAddPage(photo);
  }, [onAddPage, remainingSlots]);

  const handleUpload = useCallback(async () => {
    const picked = await pickPhotosFromLibrary(remainingSlots);
    for (const page of picked) {
      onAddPage(page);
    }
  }, [onAddPage, remainingSlots]);

  return (
    <View className="flex-1" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      <View className="mb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={onBack} className="flex-row items-center gap-1 rounded-full px-2 py-2">
          <ChevronLeft size={20} color="#6f6151" />
          <Text className="text-sm font-medium text-ink-soft">Back</Text>
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-ink">{studentName}</Text>
        <Text className="text-xs text-ink-faint">
          {pages.length}/{MAX_PAGES_PER_STUDENT}
        </Text>
      </View>

      {pages.length === 0 ? (
        <Card className="mb-4 flex-1 items-center justify-center border-dashed border-pen/30 bg-pen-wash/20 py-16">
          <Text className="text-lg font-semibold text-ink">Add page 1</Text>
          <Text className="mt-2 px-6 text-center text-sm text-ink-soft">
            Snap with your camera or upload photos you've already taken. Name on page 1 only is fine.
          </Text>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
          {pages.map((page, index) => (
            <View
              key={pickedImageKey(page, index)}
              className="w-28 overflow-hidden rounded-xl border border-line bg-paper"
            >
              <View className="flex-row items-center justify-between bg-pen-wash px-2 py-1">
                <Text className="text-xs font-bold text-pen-deep">{index + 1}</Text>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => onMovePage(index, index - 1)}
                    disabled={index === 0}
                    className="p-1"
                    hitSlop={8}
                  >
                    <ChevronUp size={14} color={index === 0 ? "#c4b8a8" : "#6f6151"} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onMovePage(index, index + 1)}
                    disabled={index === pages.length - 1}
                    className="p-1"
                    hitSlop={8}
                  >
                    <ChevronDown size={14} color={index === pages.length - 1 ? "#c4b8a8" : "#6f6151"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onRemovePage(index)} className="p-1" hitSlop={8}>
                    <X size={14} color="#6f6151" />
                  </TouchableOpacity>
                </View>
              </View>
              <Image source={{ uri: page.uri }} className="h-32 w-full" resizeMode="cover" />
            </View>
          ))}
        </ScrollView>
      )}

      {errorMessage ? (
        <View className="mb-3 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
          <Text className="text-sm text-pen-deep">{errorMessage}</Text>
        </View>
      ) : null}

      <View className="mt-auto gap-3">
        <TouchableOpacity
          onPress={() => void handleSnap()}
          className="items-center rounded-full bg-pen py-4 shadow-paper"
          accessibilityRole="button"
          accessibilityLabel={pages.length === 0 ? "Snap first page" : "Snap another page"}
        >
          <Text className="text-base font-bold text-white">
            {pages.length === 0 ? "Snap page 1" : "Snap another page"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleUpload()}
          disabled={remainingSlots <= 0}
          className="items-center rounded-full border-2 border-line bg-paper py-4 disabled:opacity-50"
          accessibilityRole="button"
          accessibilityLabel={pages.length === 0 ? "Upload first page" : "Upload more pages"}
        >
          <Text className="text-base font-bold text-pen-deep">
            {pages.length === 0 ? "Upload from photos" : "Upload more pages"}
          </Text>
        </TouchableOpacity>

        {pages.length > 0 ? (
          <TouchableOpacity
            onPress={onDone}
            className="items-center rounded-full border-2 border-pen bg-paper py-4"
          >
            <Text className="text-base font-bold text-pen-deep">Done with {studentName}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
