import { Text, View } from "react-native";

type DeterminateProgressBarProps = {
  percent: number;
  label: string;
  className?: string;
};

export default function DeterminateProgressBar({
  percent,
  label,
  className = "mt-4",
}: DeterminateProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <View className={`gap-2 ${className}`}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-xs font-semibold text-ink-soft">{label}</Text>
        <Text className="text-xs font-bold text-pen-deep">{clamped}%</Text>
      </View>
      <View
        className="h-1.5 overflow-hidden rounded-full bg-line"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clamped }}
      >
        <View className="h-full rounded-full bg-pen" style={{ width: `${clamped}%` }} />
      </View>
    </View>
  );
}
