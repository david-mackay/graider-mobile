import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { useOAuth, useSignIn, useSignInWithApple, useSignUp } from "@clerk/clerk-expo";
import { useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export type AuthOAuthProvider = "google" | "apple";

type UseGraiderAuthOptions = {
  redirectTo?: Href;
  onStarted?: () => void;
};

function clerkErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown }).errors) &&
    (err as { errors: { longMessage?: string; message?: string }[] }).errors[0]
  ) {
    const first = (err as { errors: { longMessage?: string; message?: string }[] }).errors[0];
    return first.longMessage || first.message || "Something went wrong. Try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Try again.";
}

function isAppleCancelError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ERR_REQUEST_CANCELED"
  );
}

/**
 * Email + Google + Apple auth for onboarding / landing.
 * Google uses browser OAuth. Apple uses native Sign in with Apple on iOS
 * (so the system sheet shows "Graider") and browser OAuth on Android.
 */
export function useGraiderAuth({ redirectTo = "/(teacher)", onStarted }: UseGraiderAuthOptions = {}) {
  const router = useRouter();
  const google = useOAuth({ strategy: "oauth_google" });
  const appleOAuth = useOAuth({ strategy: "oauth_apple" });
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const isLoaded = signInLoaded && signUpLoaded;

  const finish = useCallback(
    async (sessionId: string | null | undefined, setActive: ((args: { session: string }) => Promise<void>) | undefined) => {
      if (sessionId && setActive) {
        await setActive({ session: sessionId });
        router.replace(redirectTo);
        return true;
      }
      return false;
    },
    [redirectTo, router],
  );

  const continueWithGoogle = useCallback(async () => {
    onStarted?.();
    setError(null);
    setIsBusy(true);
    try {
      const { createdSessionId, setActive } = await google.startOAuthFlow();
      const ok = await finish(createdSessionId, setActive);
      if (!ok) {
        setError("Could not finish signing in. Try again.");
      }
    } catch (err) {
      console.error("[auth] google OAuth error", err);
      setError(clerkErrorMessage(err));
      throw err;
    } finally {
      setIsBusy(false);
    }
  }, [finish, google.startOAuthFlow, onStarted]);

  const continueWithApple = useCallback(async () => {
    onStarted?.();
    setError(null);
    setIsBusy(true);
    try {
      if (Platform.OS === "ios") {
        const { createdSessionId, setActive } = await startAppleAuthenticationFlow();
        const ok = await finish(createdSessionId, setActive);
        if (!ok) {
          setError("Could not finish signing in. Try again.");
        }
        return;
      }

      const { createdSessionId, setActive } = await appleOAuth.startOAuthFlow();
      const ok = await finish(createdSessionId, setActive);
      if (!ok) {
        setError("Could not finish signing in. Try again.");
      }
    } catch (err) {
      if (isAppleCancelError(err)) return;
      console.error("[auth] apple sign-in error", err);
      setError(clerkErrorMessage(err));
      throw err;
    } finally {
      setIsBusy(false);
    }
  }, [appleOAuth.startOAuthFlow, finish, onStarted, startAppleAuthenticationFlow]);

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!signUp) throw new Error("Auth is still loading.");
      onStarted?.();
      setError(null);
      setIsBusy(true);
      try {
        await signUp.create({ emailAddress: email.trim(), password });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingEmail(email.trim());
      } catch (err) {
        setError(clerkErrorMessage(err));
        throw err;
      } finally {
        setIsBusy(false);
      }
    },
    [onStarted, signUp],
  );

  const verifyEmailCode = useCallback(
    async (code: string) => {
      if (!signUp) throw new Error("Auth is still loading.");
      setError(null);
      setIsBusy(true);
      try {
        const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
        const ok = await finish(result.createdSessionId, setActiveSignUp);
        if (!ok) {
          setError("Verification incomplete. Check the code and try again.");
        }
      } catch (err) {
        setError(clerkErrorMessage(err));
        throw err;
      } finally {
        setIsBusy(false);
      }
    },
    [finish, setActiveSignUp, signUp],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!signIn) throw new Error("Auth is still loading.");
      onStarted?.();
      setError(null);
      setIsBusy(true);
      try {
        const result = await signIn.create({ identifier: email.trim(), password });
        const ok = await finish(result.createdSessionId, setActiveSignIn);
        if (!ok) {
          setError("Could not finish signing in. Try Google or Apple instead.");
        }
      } catch (err) {
        setError(clerkErrorMessage(err));
        throw err;
      } finally {
        setIsBusy(false);
      }
    },
    [finish, onStarted, setActiveSignIn, signIn],
  );

  const clearEmailPending = useCallback(() => {
    setPendingEmail(null);
    setError(null);
  }, []);

  return {
    isLoaded,
    isBusy,
    error,
    setError,
    pendingEmail,
    clearEmailPending,
    continueWithGoogle,
    continueWithApple,
    signUpWithEmail,
    signInWithEmail,
    verifyEmailCode,
  };
}

/** @deprecated Prefer useGraiderAuth — kept for a single Google CTA callers. */
export function useGraiderSignIn(options: UseGraiderAuthOptions = {}) {
  const auth = useGraiderAuth(options);
  return {
    signIn: auth.continueWithGoogle,
    isSigningIn: auth.isBusy,
  };
}
