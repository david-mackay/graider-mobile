import { Redirect, Stack, useSegments } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import AppLoadingScreen from "@/components/shared/AppLoadingScreen";

export default function MarketingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  // Onboarding save signs the user in, then navigates to /onboarding-sync to
  // POST the vault. Do NOT bounce to the dashboard mid-onboarding.
  const inOnboarding = (segments as string[]).includes("onboarding");

  if (!isLoaded) {
    return <AppLoadingScreen />;
  }

  if (isSignedIn && !inOnboarding) {
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
