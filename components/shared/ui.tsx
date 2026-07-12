import { View, Text, Switch, Pressable, TextInput, type TextInputProps } from "react-native";

type BadgeProps = { children: React.ReactNode; variant?: "blue" | "green" | "gray" | "yellow" };

/**
 * Variant names are legacy semantic slots:
 * blue = accent/active, green = done/graded, gray = neutral, yellow = attention.
 */
export function Badge({ children, variant = "blue" }: BadgeProps) {
  const container = {
    blue: "border-pen-soft/60 bg-pen-wash",
    green: "border-moss/30 bg-moss-wash",
    gray: "border-line bg-cream-deep/60",
    yellow: "border-marigold/30 bg-marigold-wash",
  } as const;
  const label = {
    blue: "text-pen-deep",
    green: "text-moss-deep",
    gray: "text-ink-soft",
    yellow: "text-marigold-deep",
  } as const;
  return (
    <View className={`self-start rounded-full border px-2.5 py-0.5 ${container[variant]}`}>
      <Text className={`text-xs font-bold ${label[variant]}`}>{children}</Text>
    </View>
  );
}

type SectionHeaderProps = { title: string; subtitle?: string; action?: React.ReactNode; overline?: string };

export function SectionHeader({ title, subtitle, action, overline }: SectionHeaderProps) {
  return (
    <View className="mb-6 flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1 pr-2">
        {overline ? (
          <Text className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em] text-pen">{overline}</Text>
        ) : null}
        <Text className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</Text>
        {subtitle ? <Text className="mt-1.5 text-sm leading-relaxed text-ink-soft">{subtitle}</Text> : null}
      </View>
      {action ? <View className="shrink-0 pt-1">{action}</View> : null}
    </View>
  );
}

type CardProps = { children: React.ReactNode; className?: string };

export function Card({ children, className = "" }: CardProps) {
  return (
    <View className={`rounded-2xl border border-line bg-paper p-5 shadow-paper ${className}`}>
      {children}
    </View>
  );
}

type FormFieldProps = { label: string; children: React.ReactNode; hint?: string };

export function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <View className="gap-1.5">
      <View>
        <Text className="text-sm font-bold text-ink">{label}</Text>
        {hint ? <Text className="mt-0.5 text-xs text-ink-faint">{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Native-safe input styles — no transition/focus utilities (they crash TextInput via Reanimated). */
export const inputClass =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint";

export function GraiderTextInput({ className, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#a3927b"
      className={className ? `${inputClass} ${className}` : inputClass}
      {...props}
    />
  );
}

/** Native-friendly primary button (avoid inline-flex / transition — they break layout on RN). */
export const btnPrimary =
  "flex-row items-center justify-center rounded-full bg-pen px-5 py-2.5 shadow-paper disabled:opacity-50";

export const btnPrimaryBlock = `${btnPrimary} w-full py-3`;

export const btnSecondary =
  "flex-row items-center justify-center rounded-full border border-line bg-paper px-5 py-2.5 shadow-paper disabled:opacity-50";

export const btnSecondaryBlock = `${btnSecondary} w-full py-3`;

export const btnDanger =
  "flex-row items-center justify-center rounded-full border border-pen-soft/60 bg-pen-wash px-4 py-2 disabled:opacity-50";

/** iOS-style settings row: label left, native switch right (pen when on). */
export function SettingSwitchRow({
  label,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-line py-3 last:border-b-0">
      <Pressable
        onPress={() => !disabled && onValueChange(!value)}
        disabled={disabled}
        className="flex-1 pr-3"
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
      >
        <Text className={`text-sm ${disabled ? "text-ink-faint" : "text-ink"}`}>{label}</Text>
      </Pressable>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#e5d9c0", true: "#be3a2e" }}
        thumbColor="#ffffff"
        ios_backgroundColor="#e5d9c0"
      />
    </View>
  );
}
