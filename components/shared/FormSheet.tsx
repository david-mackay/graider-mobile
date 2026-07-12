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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-ink/40">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="max-h-[92%] rounded-t-3xl bg-paper px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <Text className="font-display text-xl font-semibold text-ink">{title}</Text>
                {subtitle ? <Text className="mt-1 text-sm leading-relaxed text-ink-soft">{subtitle}</Text> : null}
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
              contentContainerStyle={{ paddingBottom: 8 }}
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
