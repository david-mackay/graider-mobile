import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  StatusBar,
  PanResponder,
  Animated,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useRef, useState } from "react";
import { Card } from "@/components/shared/ui";
import { assetToPickedImage, isAcceptedImageType, pickedImageKey, type PickedImage } from "@/lib/picked-image";
import { MAX_PAGES_PER_STUDENT } from "@/lib/student-grade";

const THUMB_W = 148;
const THUMB_H = 198; // ~3:4 portrait — matches a paper page
const THUMB_GAP = 12;
const LONG_PRESS_MS = 220;

type StepCapturePagesProps = {
  studentName: string;
  pages: PickedImage[];
  onAddPage: (page: PickedImage) => void;
  onRemovePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onDone: () => void;
  onBack: () => void;
  errorMessage: string;
  /** Override the label on the "Done" button. Defaults to "Done with {studentName}". */
  doneLabel?: string;
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

type PageThumbProps = {
  page: PickedImage;
  index: number;
  pageCount: number;
  isDragging: boolean;
  dragOverIndex: number | null;
  onTap: () => void;
  onRemove: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, dx: number) => void;
  onDragEnd: () => void;
};

function PageThumb({
  page,
  index,
  pageCount,
  isDragging,
  dragOverIndex,
  onTap,
  onRemove,
  onPressIn,
  onPressOut,
  onDragStart,
  onDragMove,
  onDragEnd,
}: PageThumbProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = useRef(false);
  const tapEligible = useRef(true);
  const indexRef = useRef(index);
  indexRef.current = index;

  // Keep callbacks in refs so PanResponder is created once and never
  // recreated mid-drag (recreating it was resetting the gesture).
  const callbacksRef = useRef({
    onTap,
    onRemove,
    onPressIn,
    onPressOut,
    onDragStart,
    onDragMove,
    onDragEnd,
  });
  callbacksRef.current = {
    onTap,
    onRemove,
    onPressIn,
    onPressOut,
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => draggingRef.current,
      // Never let ScrollView steal the gesture after we've claimed it.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        tapEligible.current = true;
        draggingRef.current = false;
        // Lock the strip immediately so siblings don't scroll under the finger.
        callbacksRef.current.onPressIn();
        clearLongPress();
        longPressTimer.current = setTimeout(() => {
          draggingRef.current = true;
          tapEligible.current = false;
          callbacksRef.current.onDragStart(indexRef.current);
          Animated.spring(scale, {
            toValue: 1.06,
            useNativeDriver: true,
            friction: 7,
          }).start();
        }, LONG_PRESS_MS);
      },
      onPanResponderMove: (_e: GestureResponderEvent, gesture: PanResponderGestureState) => {
        if (!draggingRef.current) {
          // Cancel long-press if the finger moved before it fired
          if (Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8) {
            clearLongPress();
          }
          return;
        }
        translateX.setValue(gesture.dx);
        callbacksRef.current.onDragMove(indexRef.current, gesture.dx);
      },
      onPanResponderRelease: (_e, gesture) => {
        clearLongPress();
        const wasDragging = draggingRef.current;
        draggingRef.current = false;
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }),
        ]).start();
        if (wasDragging) {
          callbacksRef.current.onDragEnd();
        } else if (tapEligible.current && Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) {
          callbacksRef.current.onTap();
        }
        callbacksRef.current.onPressOut();
      },
      onPanResponderTerminate: () => {
        clearLongPress();
        const wasDragging = draggingRef.current;
        draggingRef.current = false;
        translateX.setValue(0);
        scale.setValue(1);
        if (wasDragging) callbacksRef.current.onDragEnd();
        callbacksRef.current.onPressOut();
      },
    }),
  ).current;

  const isDropTarget = dragOverIndex === index && !isDragging;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        width: THUMB_W,
        height: THUMB_H,
        marginRight: THUMB_GAP,
        transform: [{ translateX }, { scale }],
        zIndex: isDragging ? 20 : 1,
        opacity: isDragging ? 0.92 : 1,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: isDropTarget ? 2 : 1,
        borderColor: isDropTarget ? "#be3a2e" : "#e5ddd0",
        backgroundColor: "#f7f3eb",
        shadowColor: "#000",
        shadowOpacity: isDragging ? 0.25 : 0.08,
        shadowRadius: isDragging ? 12 : 4,
        shadowOffset: { width: 0, height: isDragging ? 6 : 2 },
        elevation: isDragging ? 8 : 2,
      }}
    >
      <Image
        source={{ uri: page.uri }}
        style={{ width: THUMB_W, height: THUMB_H }}
        resizeMode="cover"
      />

      {/* Page number badge */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          backgroundColor: "rgba(190,58,46,0.92)",
          borderRadius: 10,
          minWidth: 22,
          height: 22,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6,
        }}
      >
        <Text style={{ color: "white", fontSize: 11, fontWeight: "800" }}>{index + 1}</Text>
      </View>

      {/* Remove */}
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={10}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderRadius: 12,
          width: 24,
          height: 24,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={13} color="white" />
      </TouchableOpacity>

      {/* Bottom fade + page count hint */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 8,
          paddingBottom: 7,
          paddingTop: 18,
          backgroundColor: "transparent",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 36,
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        />
        <Text style={{ color: "white", fontSize: 10, fontWeight: "600" }}>
          {index + 1} of {pageCount}
        </Text>
      </View>
    </Animated.View>
  );
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
  doneLabel,
}: StepCapturePagesProps) {
  const insets = useSafeAreaInsets();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const dragFromRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const pageCountRef = useRef(pages.length);
  pageCountRef.current = pages.length;

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

  const handlePressIn = useCallback(() => {
    setScrollLocked(true);
  }, []);

  const handlePressOut = useCallback(() => {
    // Only unlock if a drag isn't active (drag end clears dragFromRef first).
    if (dragFromRef.current === null) {
      setScrollLocked(false);
    }
  }, []);

  const handleDragStart = useCallback((index: number) => {
    dragFromRef.current = index;
    dragOverRef.current = index;
    setScrollLocked(true);
    setDragFromIndex(index);
    setDragOverIndex(index);
  }, []);

  const handleDragMove = useCallback((fromIndex: number, dx: number) => {
    const slot = THUMB_W + THUMB_GAP;
    const offset = Math.round(dx / slot);
    const next = Math.max(0, Math.min(pageCountRef.current - 1, fromIndex + offset));
    if (next !== dragOverRef.current) {
      dragOverRef.current = next;
      setDragOverIndex(next);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    const from = dragFromRef.current;
    const to = dragOverRef.current;
    dragFromRef.current = null;
    dragOverRef.current = null;
    setDragFromIndex(null);
    setDragOverIndex(null);
    setScrollLocked(false);
    if (from !== null && to !== null && from !== to) {
      onMovePage(from, to);
    }
  }, [onMovePage]);

  const previewPage = previewIndex !== null ? pages[previewIndex] : null;

  return (
    <View className="flex-1" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      {/* Header */}
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

      {/* Page strip or empty state */}
      {pages.length === 0 ? (
        <Card className="mb-4 flex-1 items-center justify-center border-dashed border-pen/30 bg-pen-wash/20 py-16">
          <Text className="text-lg font-semibold text-ink">Add page 1</Text>
          <Text className="mt-2 px-6 text-center text-sm text-ink-soft">
            Snap with your camera or upload photos you&apos;ve already taken. Name on page 1 only is fine.
          </Text>
        </Card>
      ) : (
        <View style={{ height: THUMB_H + 28, marginBottom: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={!scrollLocked}
            contentContainerStyle={{ paddingHorizontal: 4, alignItems: "flex-start" }}
            style={{ height: THUMB_H }}
          >
            {pages.map((page, index) => (
              <PageThumb
                key={pickedImageKey(page, index)}
                page={page}
                index={index}
                pageCount={pages.length}
                isDragging={dragFromIndex === index}
                dragOverIndex={dragOverIndex}
                onTap={() => setPreviewIndex(index)}
                onRemove={() => onRemovePage(index)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            ))}
          </ScrollView>
          <Text className="mt-2 text-center text-xs text-ink-faint">
            Hold &amp; drag to reorder · tap to preview
          </Text>
        </View>
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
            <Text className="text-base font-bold text-pen-deep">
              {doneLabel ?? `Done with ${studentName}`}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Full-screen preview modal */}
      <Modal
        visible={previewPage !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPreviewIndex(null)}
      >
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
          <TouchableOpacity
            onPress={() => setPreviewIndex(null)}
            style={{
              position: "absolute",
              top: Math.max(insets.top, 16),
              right: 16,
              zIndex: 10,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 20,
              padding: 8,
            }}
          >
            <X size={20} color="white" />
          </TouchableOpacity>

          <View
            style={{
              position: "absolute",
              top: Math.max(insets.top, 16),
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" }}>
              {previewIndex !== null ? `${previewIndex + 1} / ${pages.length}` : ""}
            </Text>
          </View>

          {previewPage ? (
            <Image source={{ uri: previewPage.uri }} style={{ flex: 1 }} resizeMode="contain" />
          ) : null}

          {pages.length > 1 ? (
            <View
              style={{
                position: "absolute",
                bottom: Math.max(insets.bottom, 24) + 8,
                left: 0,
                right: 0,
                flexDirection: "row",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <TouchableOpacity
                onPress={() => setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                disabled={previewIndex === 0}
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 24,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  opacity: previewIndex === 0 ? 0.3 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>← Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setPreviewIndex((i) => (i !== null && i < pages.length - 1 ? i + 1 : i))
                }
                disabled={previewIndex === pages.length - 1}
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 24,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  opacity: previewIndex === pages.length - 1 ? 0.3 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>Next →</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
