import type { LucideIcon } from "lucide-react-native";
import { Pressable } from "react-native";

type IconButtonProps = {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  variant?: "default" | "danger";
  size?: number;
};

const COLORS = {
  default: { icon: "#99291f", bg: "bg-paper", border: "border-line" },
  danger: { icon: "#99291f", bg: "bg-pen-wash", border: "border-pen-soft/60" },
} as const;

/** Pressable icon action — avoids TouchableOpacity + NativeWind navigation context issues. */
export default function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  disabled = false,
  variant = "default",
  size = 18,
}: IconButtonProps) {
  const palette = COLORS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      className={`h-9 w-9 items-center justify-center rounded-full border ${palette.bg} ${palette.border} disabled:opacity-40`}
    >
      <Icon size={size} color={palette.icon} />
    </Pressable>
  );
}
