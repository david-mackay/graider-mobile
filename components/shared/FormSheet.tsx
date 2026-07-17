import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { btnPrimaryBlock, btnSecondaryBlock } from "@/components/shared/ui";

type FormSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  showActions?: boolean;
};

export default function FormSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  primaryLabel = "Save",
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel = "Cancel",
  showActions = true,
}: FormSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-ink/40">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Dismiss" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            className="min-h-[45%] max-h-[92%] rounded-t-3xl bg-paper px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          >
            <View className="mb-4 flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-display text-xl font-semibold text-ink">{title}</Text>
                {subtitle ? (
                  <Text className="mt-1 text-sm leading-relaxed text-ink-soft">{subtitle}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
                className="h-9 w-9 items-center justify-center rounded-full bg-cream"
              >
                <X size={20} color="#5c4f3d" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
            >
              {children}
            </ScrollView>

            {showActions && onPrimary ? (
              <View className="mt-5 gap-3">
                <Pressable
                  onPress={onPrimary}
                  disabled={primaryDisabled || primaryLoading}
                  className={btnPrimaryBlock}
                >
                  {primaryLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">{primaryLabel}</Text>
                  )}
                </Pressable>
                <Pressable onPress={onClose} disabled={primaryLoading} className={btnSecondaryBlock}>
                  <Text className="text-sm font-medium text-pen-deep">{secondaryLabel}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
