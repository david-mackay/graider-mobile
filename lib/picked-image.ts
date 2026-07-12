/**
 * Cross-platform image picked from the camera or photo library.
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
];

export function isAcceptedImageType(image: PickedImage): boolean {
  return (
    ACCEPTED_TYPES.includes(image.type.toLowerCase()) ||
    /\.(jpe?g|png|heic|heif)$/i.test(image.name)
  );
}

export function pickedImageKey(image: PickedImage, index = 0): string {
  return `${image.uri}:${image.name}:${image.size}:${index}`;
}

/** Append a native image blob to FormData for multipart upload. */
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
      type: image.type || "image/jpeg",
    } as unknown as Blob,
  );
}

export function assetToPickedImage(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}): PickedImage {
  return {
    uri: asset.uri,
    name: asset.fileName || `image-${Date.now()}.jpg`,
    type: asset.mimeType || "image/jpeg",
    size: asset.fileSize ?? 0,
  };
}
