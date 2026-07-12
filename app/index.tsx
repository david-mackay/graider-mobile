import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import LandingPage from "@/components/marketing/LandingPage";
import { View, ActivityIndicator } from "react-native";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { handleJson } from "@/lib/dashboard-client";
import type { AppRole } from "@/lib/types";

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
        const res = await handleJson<{ user: { role: AppRole } }>(
          await graiderFetch("/api/me/role", { cache: "no-store" }),
        );
        if (!cancelled) setRole(res.user.role);
      } catch {
        // New users may not have a profile yet — teacher workspace handles setup.
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
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color="#be3a2e" />
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
