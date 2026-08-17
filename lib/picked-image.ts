/**
 * Cross-platform image or PDF picked from camera, photo library, or files.
 * React Native FormData expects { uri, name, type } blobs — not web File objects.
 */
export type PickedImage = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/x-pdf",
];

export function inferPickedContentType(image: Pick<PickedImage, "name" | "type">): string {
  const type = (image.type ?? "").trim().toLowerCase();
  if (type && type !== "application/octet-stream") {
    if (type === "application/x-pdf") return "application/pdf";
    if (ACCEPTED_TYPES.includes(type)) return type;
  }
  const lower = image.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return type || "image/jpeg";
}

export function isPdfPage(image: Pick<PickedImage, "name" | "type">): boolean {
  return inferPickedContentType(image) === "application/pdf";
}

export function isAcceptedImageType(image: PickedImage): boolean {
  return (
    ACCEPTED_TYPES.includes(image.type.toLowerCase()) ||
    /\.(jpe?g|png|heic|heif|pdf)$/i.test(image.name)
  );
}

export function pickedImageKey(image: PickedImage, index = 0): string {
  return `${image.uri}:${image.name}:${image.size}:${index}`;
}

/** Append a native image or PDF blob to FormData for multipart upload. */
export function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  image: PickedImage,
): void {
  formData.append(
    fieldName,
    {
      uri: image.uri,
      name: image.name,
      type: inferPickedContentType(image),
    } as unknown as Blob,
  );
}

export function assetToPickedImage(asset: {
  uri: string;
  fileName?: string | null;
  name?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  size?: number | null;
}): PickedImage {
  const name = asset.fileName || asset.name || `image-${Date.now()}.jpg`;
  const type = inferPickedContentType({
    name,
    type: asset.mimeType || "",
  });
  return {
    uri: asset.uri,
    name,
    type,
    size: asset.fileSize ?? asset.size ?? 0,
  };
}
