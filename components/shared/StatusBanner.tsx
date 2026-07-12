import { View, Text, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { IconCheck, IconX } from "@/components/shared/icons";
import type { StatusType } from "@/lib/dashboard-client";

type StatusBannerProps = {
  message: string;
  type: StatusType;
  onDismiss: () => void;
};

export default function StatusBanner({ message, type, onDismiss }: StatusBannerProps) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      className={`mb-4 flex-row animate-rise items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-paper ${
        type === "error"
          ? "border-pen-soft/60 bg-pen-wash"
          : "border-moss/30 bg-moss-wash"
      }`}
    >
      {type === "error" ? (
        <Svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#99291f" strokeWidth={2} style={{ marginTop: 2 }}>
          <Path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </Svg>
      ) : (
        <IconCheck className="h-4 w-4 text-moss-deep" />
      )}
      <Text
        className={`flex-1 text-sm font-bold ${type === "error" ? "text-pen-deep" : "text-moss-deep"}`}
      >
        {message}
      </Text>
      <TouchableOpacity onPress={onDismiss} accessibilityLabel="Dismiss" className="opacity-60">
        <IconX className="h-4 w-4" color={type === "error" ? "#99291f" : "#38613f"} />
      </TouchableOpacity>
    </View>
  );
}
