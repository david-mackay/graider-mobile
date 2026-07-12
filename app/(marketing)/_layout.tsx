import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { clearVault } from "@/lib/onboarding/vault";

export default function MarketingLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) void clearVault();
  }, [isSignedIn]);

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(teacher)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="onboarding/hook" />
      <Stack.Screen name="onboarding/capabilities" />
      <Stack.Screen name="onboarding/answer-key" />
      <Stack.Screen name="onboarding/upload" />
      <Stack.Screen name="onboarding/result" />
      <Stack.Screen name="onboarding/save" />
    </Stack>
  );
}
