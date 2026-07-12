import type { ReactNode } from "react";
import { View, Text } from "react-native";
import type { RosterEntry } from "@/lib/types";
import { duplicateNameCounts, rosterDisplayLabel } from "@/lib/roster-display";

type RosterStudentRowProps = {
  entry: RosterEntry;
  roster?: RosterEntry[];
  trailing?: ReactNode;
  showEmail?: boolean;
};

export default function RosterStudentRow({
  entry,
  roster,
  trailing,
  showEmail = true,
}: RosterStudentRowProps) {
  const nameCounts = roster ? duplicateNameCounts(roster) : undefined;
  const { primaryLabel, secondaryLabel } = rosterDisplayLabel(entry, nameCounts);

  return (
    <View className="flex-1 flex-row items-center">
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-pen-wash">
        <Text className="text-base font-bold text-pen-deep">
          {primaryLabel.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-ink" numberOfLines={1}>
          {primaryLabel}
        </Text>
        {showEmail && secondaryLabel ? (
          <Text className="text-xs text-ink-faint" numberOfLines={1}>
            {secondaryLabel}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
