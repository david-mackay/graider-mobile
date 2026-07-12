import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useRef } from "react";

/**
 * Absolute backend URL for an `/api/...` path. Requires `EXPO_PUBLIC_APP_URL`
 * (e.g. https://graider.vercel.app) so native builds do not hit the Metro host.
 */
export function resolveGraiderApiUrl(path: string): string {
  const base = process.env.EXPO_PUBLIC_APP_URL;
  if (!base) {
    throw new Error("Missing EXPO_PUBLIC_APP_URL");
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, base).href;
}

/**
 * Authenticated requests to the Next.js API: full origin + Clerk session JWT
 * (cookies are not sent from the Expo app to Vercel).
 *
 * Returns a stable callback (empty deps) so effects do not re-fire every render
 * when Clerk's getToken identity changes.
 */
export function useGraiderFetch() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  return useCallback(async (path: string, init?: RequestInit): Promise<Response> => {
    const url = resolveGraiderApiUrl(path);
    const headers = new Headers(init?.headers);
    const token = await getTokenRef.current();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(url, { ...init, headers });
  }, []);
}
