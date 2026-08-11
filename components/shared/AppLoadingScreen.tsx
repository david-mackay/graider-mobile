import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type AppLoadingScreenProps = {
  /** Optional status line (e.g. Clerk hang diagnostics). */
  message?: string;
};

/**
 * Full-screen loader that does NOT depend on NativeWind.
 * TestFlight blank-white often meant className styles never applied while
 * Clerk/fonts were still starting.
 */
export default function AppLoadingScreen({ message }: AppLoadingScreenProps) {
  return (
    <View style={styles.root} accessibilityLabel="Loading Graider">
      <ActivityIndicator size="large" color="#be3a2e" />
      <Text style={styles.title}>Graider</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6efe1",
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: "#2c231b",
  },
  message: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: "#6f6151",
  },
});
