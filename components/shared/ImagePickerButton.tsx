import { View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { assetToPickedImage, type PickedImage } from "@/lib/picked-image";

type ImagePickerButtonProps = {
  onFilesSelected: (files: PickedImage[]) => void;
  multiple?: boolean;
  className?: string;
  /** When false, only show the gallery button (legacy single-button mode). */
  showCamera?: boolean;
  galleryTitle?: string;
  cameraTitle?: string;
};

async function requestLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photo access needed",
      "Allow photo library access in Settings to upload stack photos.",
    );
    return false;
  }
  return true;
}

async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera access needed",
      "Allow camera access in Settings to photograph your paper stack.",
    );
    return false;
  }
  return true;
}

export default function ImagePickerButton({
  onFilesSelected,
  multiple = false,
  className,
  showCamera = true,
  galleryTitle = "Photo Library",
  cameraTitle = "Take Photo",
}: ImagePickerButtonProps) {
  async function pickFromLibrary() {
    if (!(await requestLibraryPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: multiple,
      base64: false,
      quality: 0.85,
    });

    if (!result.canceled) {
      onFilesSelected(result.assets.map(assetToPickedImage));
    }
  }

  async function pickFromCamera() {
    if (!(await requestCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: false,
      quality: 0.85,
    });

    if (!result.canceled) {
      onFilesSelected(result.assets.map(assetToPickedImage));
    }
  }

  if (!showCamera) {
    return (
      <TouchableOpacity
        onPress={pickFromLibrary}
        className={`rounded-lg bg-cream-deep px-4 py-2 ${className || ""}`}
      >
        <Text className="text-sm font-medium text-pen-deep">{galleryTitle}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className={`flex-row flex-wrap items-center justify-center gap-3 ${className || ""}`}>
      <TouchableOpacity
        onPress={pickFromCamera}
        className="rounded-full bg-pen px-5 py-2.5 shadow-paper"
      >
        <Text className="text-sm font-semibold text-white">{cameraTitle}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={pickFromLibrary}
        className="rounded-full border border-line bg-paper px-5 py-2.5"
      >
        <Text className="text-sm font-medium text-pen-deep">{galleryTitle}</Text>
      </TouchableOpacity>
      {Platform.OS === "ios" ? (
        <Text className="w-full text-center text-xs text-ink-faint">
          HEIC from iPhone camera works great.
        </Text>
      ) : null}
    </View>
  );
}
