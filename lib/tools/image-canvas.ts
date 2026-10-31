import type { Rect, Transform } from "./crop";
import { transformMatrix } from "./crop";
import { TYPE_LABELS, type ImageType } from "./image";

/** Browser-only image encoding. Everything happens on the visitor's device; nothing is uploaded. */
export interface EncodeOptions {
  width: number;
  height: number;
  type: ImageType;
  /** 0 to 1; ignored for PNG. */
  quality: number;
  /** Flip, turn and crop instead of resizing. `width` and `height` are then the size of the crop. */
  edit?: { transform: Transform; crop: Rect };
}

export async function encodeImage(bitmap: ImageBitmap, { width, height, type, quality, edit }: EncodeOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the image.");
  if (type === "image/jpeg") {
    // JPG has no transparency; without this, transparent areas turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingQuality = "high";
  if (edit) {
    const [a, b, c, d, e, f] = transformMatrix(bitmap.width, bitmap.height, edit.transform);
    context.setTransform(a, b, c, d, e - edit.crop.x, f - edit.crop.y);
    context.drawImage(bitmap, 0, 0);
  } else {
    context.drawImage(bitmap, 0, 0, width, height);
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("Your browser could not create the image.");
  if (blob.type !== type) throw new Error(`Your browser cannot create ${TYPE_LABELS[type]} files. Try another format.`);
  return blob;
}

/** Whether this browser can create files of this type. Safari, for one, cannot create WebP files. */
export async function canEncode(type: ImageType): Promise<boolean> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    return blob?.type === type;
  } catch {
    return false;
  }
}

/** Decode a file, honouring its EXIF rotation. */
export function decodeImage(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}
