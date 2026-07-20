import { ActivityIndicator, View } from "react-native";

/** Full-screen cream spinner — use instead of `return null` while Clerk/auth loads. */
export default function AppLoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <ActivityIndicator size="large" color="#be3a2e" />
    </View>
  );
}
