import 'react-native-gesture-handler';
import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Caveat_400Regular,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
import { ClerkProvider, ClerkLoaded, ClerkLoading } from '@clerk/clerk-expo';
import { tokenCache } from '../cache';

import { useColorScheme } from '@/components/useColorScheme';
import { SubscriptionProvider } from '@/components/subscriptions/SubscriptionProvider';
import AppLoadingScreen from '@/components/shared/AppLoadingScreen';
import AppUpdatesProvider from '@/components/shared/AppUpdatesProvider';
import PushNotificationsProvider from '@/components/shared/PushNotificationsProvider';
import ServiceHealthProvider from '@/components/shared/ServiceHealthProvider';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';
const clerkKeyKind = publishableKey.startsWith('pk_live_')
  ? 'live'
  : publishableKey.startsWith('pk_test_')
    ? 'test'
    : 'missing';

/** After this, show a diagnostic instead of an endless cream/white hang. */
const CLERK_LOAD_TIMEOUT_MS = 12_000;

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Caveat_400Regular,
    Caveat_700Bold,
  });
  const [clerkTimedOut, setClerkTimedOut] = useState(false);

  useEffect(() => {
    if (loaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, fontError]);

  // Always hide splash eventually so we never sit on a blank system splash.
  useEffect(() => {
    const t = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 8_000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loaded || !publishableKey) return;
    const t = setTimeout(() => setClerkTimedOut(true), CLERK_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loaded]);

  if (fontError) {
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorTitle}>Couldn’t load fonts</Text>
        <Text style={styles.errorBody}>{String(fontError.message ?? fontError)}</Text>
      </View>
    );
  }

  if (!loaded) {
    return <AppLoadingScreen message="Loading fonts…" />;
  }

  if (!publishableKey) {
    return (
      <AppLoadingScreen message="Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in this build." />
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoading>
        <AppLoadingScreen
          message={
            clerkTimedOut
              ? `Clerk is taking too long (key: ${clerkKeyKind}). In Clerk Production → Native applications, add bundle id com.davidtapestry.graider-mobile and Team ID 9UHCNK7769. Also confirm clerk.graider.org DNS.`
              : 'Starting sign-in…'
          }
        />
      </ClerkLoading>
      <ClerkLoaded>
        <AppUpdatesProvider>
          <ServiceHealthProvider>
            <PushNotificationsProvider>
              <SubscriptionProvider>
                <RootLayoutNav />
              </SubscriptionProvider>
            </PushNotificationsProvider>
          </ServiceHealthProvider>
        </AppUpdatesProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(marketing)" />
        <Stack.Screen name="onboarding-sync" />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6efe1',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#99291f',
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 13,
    color: '#6f6151',
    textAlign: 'center',
  },
});
