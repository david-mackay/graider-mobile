import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMemo, useState } from "react";
import type { RosterEntry } from "@/lib/types";
import {
  duplicateNameCounts,
  rosterDisplayLabel,
  searchAndSortRoster,
} from "@/lib/roster-display";
import {
  SKIP_VALUE,
  type AssignmentValue,
} from "@/components/teacher/grade-wizard/use-student-grade";

type RosterPickerProps = {
  roster: RosterEntry[];
  value: AssignmentValue;
  onChange: (value: AssignmentValue) => void;
  disabled?: boolean;
};

const SKIP_OPTION = {
  value: SKIP_VALUE as AssignmentValue,
  label: "Skip this page",
  searchKey: "skip this page",
  isSkip: true as const,
};

export default function RosterPicker({
  roster,
  value,
  onChange,
  disabled = false,
}: RosterPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const nameCounts = useMemo(() => duplicateNameCounts(roster), [roster]);
  const filteredRoster = useMemo(() => searchAndSortRoster(roster, query), [roster, query]);

  const options = useMemo(
    () => [
      SKIP_OPTION,
      ...filteredRoster.map((entry) => {
        const { primaryLabel, secondaryLabel, searchKey } = rosterDisplayLabel(entry, nameCounts);
        return {
          value: entry.user_id as AssignmentValue,
          label: primaryLabel,
          sublabel: secondaryLabel,
          searchKey,
          isSkip: false as const,
        };
      }),
    ],
    [filteredRoster, nameCounts],
  );

  const selectedOption = useMemo(() => {
    if (!value) return null;
    if (value === SKIP_VALUE) return SKIP_OPTION;
    const entry = roster.find((r) => r.user_id === value);
    if (!entry) return null;
    const { primaryLabel, secondaryLabel } = rosterDisplayLabel(entry, nameCounts);
    return { value, label: primaryLabel, sublabel: secondaryLabel, isSkip: false as const };
  }, [roster, value, nameCounts]);

  const triggerLabel = selectedOption?.label ?? "Select student…";

  return (
    <View>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`w-full flex-row items-center justify-between rounded-lg border px-3 py-2 ${
          disabled ? "border-line bg-cream-deep" : "border-line bg-cream"
        }`}
      >
        <Text className={selectedOption ? "text-ink" : "text-ink-faint"}>{triggerLabel}</Text>
        <Text className="text-ink-faint">v</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-cream px-4 pb-8 pt-4" onPress={(e) => e.stopPropagation()}>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
            <Text className="mb-2 text-center text-base font-bold text-ink">Assign student</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search first or last name…"
              className="mb-3 rounded-md border border-line bg-cream px-3 py-2 text-sm text-ink"
              autoCapitalize="words"
            />
            {roster.length === 0 ? (
              <Text className="mb-3 text-xs text-ink-soft">This class has no students yet.</Text>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.length === 0 ? (
                <Text className="px-3 py-2 text-xs italic text-ink-faint">No matches.</Text>
              ) : (
                options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <TouchableOpacity
                      key={option.isSkip ? "skip" : option.value}
                      onPress={() => {
                        onChange(option.value);
                        setOpen(false);
                        setQuery("");
                      }}
                      className="flex-row items-center justify-between rounded-xl px-3 py-3"
                    >
                      <View className="flex-1">
                        <Text className={`text-sm ${option.isSkip ? "font-medium text-ink-soft" : "text-ink"}`}>
                          {option.label}
                        </Text>
                        {"sublabel" in option && option.sublabel ? (
                          <Text className="text-xs text-ink-faint">{option.sublabel}</Text>
                        ) : null}
                      </View>
                      {isSelected ? <Text className="text-pen">Selected</Text> : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
