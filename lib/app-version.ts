import Constants from "expo-constants";
import { Platform } from "react-native";
import { currentUpdateMetadata } from "@/lib/ota-updates";

export type PlatformVersionPolicy = {
  minVersion: string;
  latestVersion: string;
  storeUrl: string;
};

export type AppVersionPolicy = {
  ios: PlatformVersionPolicy;
  android: PlatformVersionPolicy;
  schemaVersion?: number;
};

export type NativeAppIdentity = {
  /** User-facing version from the native binary (expo.version). */
  nativeVersion: string;
  /** iOS CFBundleVersion / Android versionCode when available. */
  nativeBuild: string | null;
  /** EAS Update runtime — matches expo.version under appVersion policy. */
  runtimeVersion: string | null;
  channel: string | null;
  updateId: string | null;
  isEmbeddedLaunch: boolean;
  platform: "ios" | "android" | "web";
};

function normalizeVersion(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  return trimmed || "0.0.0";
}

/** Compare dotted versions: -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    normalizeVersion(v)
      .split(/[.+-]/)
      .map((part) => {
        const n = Number.parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });
  const aa = parse(a);
  const bb = parse(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const diff = (aa[i] ?? 0) - (bb[i] ?? 0);
    if (diff < 0) return -1;
    if (diff > 0) return 1;
  }
  return 0;
}

export function getNativeAppIdentity(): NativeAppIdentity {
  const updates = currentUpdateMetadata();
  const platform =
    Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

  return {
    nativeVersion: normalizeVersion(
      Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "0.0.0",
    ),
    nativeBuild: Constants.nativeBuildVersion ?? null,
    runtimeVersion: updates.runtimeVersion,
    channel: updates.channel,
    updateId: updates.updateId,
    isEmbeddedLaunch: updates.isEmbeddedLaunch,
    platform,
  };
}

/** Compact label for Account / debug: `1.0.0 (42) · ota a1b2c3d`. */
export function formatAppVersionLabel(identity = getNativeAppIdentity()): string {
  const build = identity.nativeBuild ? ` (${identity.nativeBuild})` : "";
  const ota =
    identity.updateId && !identity.isEmbeddedLaunch
      ? ` · ota ${identity.updateId.slice(0, 8)}`
      : identity.isEmbeddedLaunch
        ? " · store build"
        : "";
  return `${identity.nativeVersion}${build}${ota}`;
}

export type StoreUpdateDecision =
  | { kind: "ok" }
  | { kind: "soft"; latestVersion: string; storeUrl: string }
  | { kind: "force"; minVersion: string; storeUrl: string };

export function decideStoreUpdate(
  identity: NativeAppIdentity,
  policy: AppVersionPolicy,
): StoreUpdateDecision {
  if (identity.platform === "web") return { kind: "ok" };

  const platformPolicy =
    identity.platform === "ios" ? policy.ios : policy.android;
  const storeUrl = platformPolicy.storeUrl.trim();

  if (compareVersions(identity.nativeVersion, platformPolicy.minVersion) < 0) {
    return {
      kind: "force",
      minVersion: platformPolicy.minVersion,
      storeUrl,
    };
  }

  if (compareVersions(identity.nativeVersion, platformPolicy.latestVersion) < 0) {
    return {
      kind: "soft",
      latestVersion: platformPolicy.latestVersion,
      storeUrl,
    };
  }

  return { kind: "ok" };
}

export async function fetchAppVersionPolicy(
  apiBase: string,
): Promise<AppVersionPolicy | null> {
  try {
    const url = new URL("/api/app-version", apiBase).href;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const payload = (await res.json()) as AppVersionPolicy;
    if (!payload?.ios?.minVersion || !payload?.android?.minVersion) return null;
    return payload;
  } catch (error) {
    console.warn("[updates] app-version fetch failed:", error);
    return null;
  }
}
