import { Pressable, Text, View } from "react-native";
import {
  PARSE_PRESET_OPTIONS,
  type DocumentParsePreset,
  type ParseSurface,
} from "@/lib/parse-presets";

type ParsePresetPickerProps = {
  surface: ParseSurface;
  value: DocumentParsePreset;
  onChange: (preset: DocumentParsePreset) => void;
  disabled?: boolean;
};

export default function ParsePresetPicker({
  value,
  onChange,
  disabled = false,
}: ParsePresetPickerProps) {
  const selected = PARSE_PRESET_OPTIONS.find((o) => o.id === value) ?? PARSE_PRESET_OPTIONS[0];

  return (
    <View className="gap-2">
      <Text className="text-xs font-bold uppercase tracking-wide text-ink-faint">Document type</Text>
      <View className="flex-row flex-wrap gap-2">
        {PARSE_PRESET_OPTIONS.map((option) => {
          const active = option.id === value;
          return (
            <Pressable
              key={option.id}
              disabled={disabled}
              onPress={() => onChange(option.id)}
              className={`rounded-full px-3 py-1.5 ${
                active ? "bg-pen" : "border border-line bg-cream"
              } ${disabled ? "opacity-50" : ""}`}
            >
              <Text className={`text-xs font-bold ${active ? "text-white" : "text-ink-soft"}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-xs leading-relaxed text-ink-faint">{selected?.hint}</Text>
    </View>
  );
}
