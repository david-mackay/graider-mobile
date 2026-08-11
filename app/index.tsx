import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import LandingPage from "@/components/marketing/LandingPage";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { handleJson } from "@/lib/dashboard-client";
import type { AppRole } from "@/lib/types";

const ROLE_FETCH_TIMEOUT_MS = 10_000;

export default function RootPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const graiderFetch = useGraiderFetch();
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    let cancelled = false;
    setRoleLoading(true);

    (async () => {
      try {
        const res = await Promise.race([
          (async () =>
            handleJson<{ user: { role: AppRole } }>(
              await graiderFetch("/api/me/role", { cache: "no-store" }),
            ))(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("ROLE_TIMEOUT")), ROLE_FETCH_TIMEOUT_MS);
          }),
        ]);
        if (!cancelled) setRole(res.user.role);
      } catch {
        // Profile missing OR API unreachable — don't white-screen forever.
        if (!cancelled) setRole("teacher");
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, graiderFetch]);

  if (!isLoaded || (isSignedIn && roleLoading)) {
    return (
      <View style={styles.loading} accessibilityLabel="Loading Graider">
        <ActivityIndicator size="large" color="#be3a2e" />
        <Text style={styles.loadingText}>Loading your workspace…</Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return <LandingPage />;
  }

  if (role === "student") {
    return <Redirect href="/(student)" />;
  }

  return <Redirect href="/(teacher)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6efe1",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: "#6f6151",
    textAlign: "center",
  },
});
