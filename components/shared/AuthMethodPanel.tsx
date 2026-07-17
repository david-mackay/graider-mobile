import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useGraiderAuth } from "@/lib/auth/use-graider-auth";
import type { Href } from "expo-router";

type AuthMethodPanelProps = {
  redirectTo: Href;
  onStarted?: () => void;
  intent?: "sign-up" | "sign-in";
};

export default function AuthMethodPanel({
  redirectTo,
  onStarted,
  intent = "sign-up",
}: AuthMethodPanelProps) {
  const {
    isLoaded,
    isBusy,
    error,
    pendingEmail,
    clearEmailPending,
    continueWithGoogle,
    continueWithApple,
    signUpWithEmail,
    signInWithEmail,
    verifyEmailCode,
  } = useGraiderAuth({ redirectTo, onStarted });

  const [mode, setMode] = useState<"chooser" | "email">("chooser");
  const [authMode, setAuthMode] = useState<"sign-up" | "sign-in">(
    intent === "sign-in" ? "sign-in" : "sign-up",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const btnBase = "w-full items-center justify-center rounded-full px-6 py-4";

  async function onOAuth(provider: "google" | "apple") {
    try {
      if (provider === "google") await continueWithGoogle();
      else await continueWithApple();
    } catch {
      // error state already set on the hook
    }
  }

  async function onSubmitEmail() {
    try {
      if (authMode === "sign-in") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch {
      // hook sets error
    }
  }

  async function onSubmitCode() {
    try {
      await verifyEmailCode(code);
    } catch {
      // hook sets error
    }
  }

  if (pendingEmail) {
    return (
      <View className="gap-3">
        <Text className="text-sm text-ink-soft">
          Enter the code we sent to <Text className="font-semibold text-ink">{pendingEmail}</Text>.
        </Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          placeholder="Verification code"
          placeholderTextColor="#9ca3af"
          className="rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink"
        />
        {error ? <Text className="text-sm font-semibold text-pen-deep">{error}</Text> : null}
        <TouchableOpacity
          onPress={() => void onSubmitCode()}
          disabled={isBusy || !isLoaded}
          className={`${btnBase} bg-pen`}
        >
          {isBusy ? (
            <ActivityIndicator color="#fffcf5" />
          ) : (
            <Text className="text-base font-semibold text-white">Verify email</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={clearEmailPending} disabled={isBusy}>
          <Text className="text-center text-xs font-semibold text-ink-soft">Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === "email") {
    return (
      <View className="gap-3">
        <View className="flex-row rounded-full border border-line bg-cream p-1">
          <TouchableOpacity
            onPress={() => setAuthMode("sign-up")}
            className={`flex-1 items-center rounded-full px-3 py-2 ${authMode === "sign-up" ? "bg-pen" : ""}`}
          >
            <Text
              className={`text-xs font-bold ${authMode === "sign-up" ? "text-white" : "text-ink-soft"}`}
            >
              Sign up
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAuthMode("sign-in")}
            className={`flex-1 items-center rounded-full px-3 py-2 ${authMode === "sign-in" ? "bg-pen" : ""}`}
          >
            <Text
              className={`text-xs font-bold ${authMode === "sign-in" ? "text-white" : "text-ink-soft"}`}
            >
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          className="rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={authMode === "sign-up" ? "new-password" : "password"}
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          className="rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink"
        />
        {error ? <Text className="text-sm font-semibold text-pen-deep">{error}</Text> : null}
        <TouchableOpacity
          onPress={() => void onSubmitEmail()}
          disabled={isBusy || !isLoaded}
          className={`${btnBase} bg-pen`}
        >
          {isBusy ? (
            <ActivityIndicator color="#fffcf5" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {authMode === "sign-up" ? "Create account" : "Sign in with email"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("chooser")}
          disabled={isBusy}
        >
          <Text className="text-center text-xs font-semibold text-ink-soft">
            Other ways to continue
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <TouchableOpacity
        onPress={() => void onOAuth("google")}
        disabled={isBusy || !isLoaded}
        className={`${btnBase} border border-line bg-paper`}
      >
        {isBusy ? (
          <ActivityIndicator color="#be3a2e" />
        ) : (
          <Text className="text-base font-semibold text-ink">Continue with Google</Text>
        )}
      </TouchableOpacity>

      {/* Apple Sign In is iOS-first; still offer on Android via Clerk browser OAuth */}
      <TouchableOpacity
        onPress={() => void onOAuth("apple")}
        disabled={isBusy || !isLoaded}
        className={`${btnBase} bg-ink`}
      >
        <Text className="text-base font-semibold text-white">
          Continue with Apple{Platform.OS === "android" ? "" : ""}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setMode("email")}
        disabled={isBusy || !isLoaded}
        className={`${btnBase} bg-pen`}
      >
        <Text className="text-base font-semibold text-white">Continue with email</Text>
      </TouchableOpacity>

      {error ? (
        <Text className="text-center text-sm font-semibold text-pen-deep">{error}</Text>
      ) : null}
    </View>
  );
}
