import { TYPE_LABELS, type ImageType } from "./image";

/** Browser-only image encoding. Everything happens on the visitor's device; nothing is uploaded. */
export interface EncodeOptions {
  width: number;
  height: number;
  type: ImageType;
  /** 0 to 1; ignored for PNG. */
  quality: number;
}

export async function encodeImage(bitmap: ImageBitmap, { width, height, type, quality }: EncodeOptions): Promise<Blob> {
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
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("Your browser could not create the image.");
  if (blob.type !== type) throw new Error(`Your browser cannot create ${TYPE_LABELS[type]} files. Try another format.`);
  return blob;
}

/** Decode a file, honouring its EXIF rotation. */
export function decodeImage(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}
