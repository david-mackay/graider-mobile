import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import AppLoadingScreen from "@/components/shared/AppLoadingScreen";

export default function StudentLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AppLoadingScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
    </Stack>
  );
}
