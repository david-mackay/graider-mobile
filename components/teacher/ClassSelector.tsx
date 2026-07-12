import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { ALL_CLASSES_VALUE } from "@/lib/dashboard-client";
import type { DashboardClass } from "@/lib/dashboard-types";

type ClassSelectorProps = {
  classes: DashboardClass[];
  selectedClassId: string;
  onSelect: (id: string) => void;
};

export default function ClassSelector({ classes, selectedClassId, onSelect }: ClassSelectorProps) {
  const [open, setOpen] = useState(false);
  const label =
    selectedClassId === ALL_CLASSES_VALUE
      ? "All classes"
      : (classes.find((c) => c.id === selectedClassId)?.name ?? "Select class");

  function pick(id: string) {
    onSelect(id);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 rounded-xl border border-line bg-cream px-3 py-2.5"
        accessibilityRole="button"
        accessibilityLabel={`Class: ${label}`}
      >
        <View className="flex-1">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Class</Text>
          <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
            {label}
          </Text>
        </View>
        <ChevronDown size={18} color="#be3a2e" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-cream px-4 pb-8 pt-4" onPress={(e) => e.stopPropagation()}>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
            <Text className="mb-3 text-center font-display text-base font-semibold text-ink">Switch class</Text>
            <ScrollView>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => pick(c.id)}
                  className="flex-row items-center justify-between rounded-xl px-3 py-3"
                >
                  <Text className="text-sm font-medium text-ink">{c.name}</Text>
                  {selectedClassId === c.id ? <Check size={18} color="#be3a2e" /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
