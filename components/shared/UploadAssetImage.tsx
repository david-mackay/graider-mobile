import { useAuth } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import { Image, View, type ImageStyle, type StyleProp } from "react-native";
import { uploadAssetUrl } from "@/lib/upload-asset-url";

type UploadAssetImageProps = {
  storagePath: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
};

/** Renders a stored upload (stack photo) with Clerk auth headers. */
export default function UploadAssetImage({ storagePath, className, style }: UploadAssetImageProps) {
  const { getToken } = useAuth();
  const [authHeaders, setAuthHeaders] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getToken();
      if (cancelled) return;
      setAuthHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, storagePath]);

  if (!authHeaders) {
    return <View className={`bg-cream-deep ${className ?? ""}`} style={style} />;
  }

  return (
    <Image
      source={{ uri: uploadAssetUrl(storagePath), headers: authHeaders }}
      className={className}
      style={style}
      resizeMode="cover"
    />
  );
}
