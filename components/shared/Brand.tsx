import { View, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

type BrandMarkProps = { className?: string };

/** A sheet of paper carrying a hand-drawn red check — the graider mark. */
export function BrandMark({ className = "h-8 w-8" }: BrandMarkProps) {
  return (
    <View
      className={`relative items-center justify-center rounded-[26%] border border-line bg-paper shadow-paper ${className}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg viewBox="0 0 24 24" fill="none" width="62%" height="62%" style={{ transform: [{ rotate: "-6deg" }] }}>
        <Path
          d="M4.5 13.5 C 7 16.5, 8.5 18.5, 9.5 19.5 C 12 14, 15.5 8.5, 20 4.5"
          stroke="#be3a2e"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

type WordmarkProps = { className?: string };

export function Wordmark({ className = "text-xl" }: WordmarkProps) {
  return (
    <Text className={`font-display font-semibold tracking-tight text-ink ${className}`}>
      gr<Text className="font-bold text-pen">ai</Text>der
    </Text>
  );
}
