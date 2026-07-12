import { resolveGraiderApiUrl } from "@/lib/graider-fetch";

/** Build an authenticated API URL for a stored upload path (stack photos, imports). */
export function uploadAssetUrl(storagePath: string): string {
  const segments = storagePath.split("/").map((segment) => encodeURIComponent(segment));
  return resolveGraiderApiUrl(`/api/uploads/${segments.join("/")}`);
}
