import { View, Text, Pressable, StyleSheet } from "react-native";

type SegmentedControlProps<T extends string> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: 9999,
    backgroundColor: "rgba(237, 227, 204, 0.6)",
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: "#fdfaf1",
    shadowColor: "rgba(62, 44, 37, 0.12)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  labelActive: {
    color: "#99291f",
  },
  labelInactive: {
    color: "#a3927b",
  },
});

/** StyleSheet-only segments — NativeWind className on Pressable can crash with no navigation context. */
export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active ? styles.segmentActive : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
