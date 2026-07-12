import { useCallback, useState } from "react";
import { useOAuth } from "@clerk/clerk-expo";
import { useRouter, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

type UseGraiderSignInOptions = {
  redirectTo?: Href;
  onStarted?: () => void;
};

export function useGraiderSignIn({ redirectTo = "/(teacher)", onStarted }: UseGraiderSignInOptions = {}) {
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signIn = useCallback(async () => {
    onStarted?.();
    setIsSigningIn(true);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace(redirectTo);
      }
    } catch (err) {
      console.error("OAuth error", err);
      throw err;
    } finally {
      setIsSigningIn(false);
    }
  }, [onStarted, redirectTo, router, startOAuthFlow]);

  return { signIn, isSigningIn };
}
