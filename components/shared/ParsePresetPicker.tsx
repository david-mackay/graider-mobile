import { Pressable, Text, View } from "react-native";
import {
  presetsForSurface,
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
  surface,
  value,
  onChange,
  disabled = false,
}: ParsePresetPickerProps) {
  const options = presetsForSurface(surface);
  return (
    <View className="gap-2">
      <Text className="text-xs font-bold uppercase tracking-wide text-ink-faint">Document type</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
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
    </View>
  );
}
