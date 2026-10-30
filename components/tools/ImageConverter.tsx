"use client";

import { useEffect, useState } from "react";
import { IMAGE_TYPES, isLossy, TYPE_LABELS, type ImageType } from "../../lib/tools/image";
import { canEncode } from "../../lib/tools/image-canvas";
import { FilePicker, ImageOutput, RangeField, useEncoded, useImageSource } from "./imageShared";
import { SelectField, ToolLayout } from "./ui";

export default function ImageConverter() {
  const { source, error: sourceError, choose } = useImageSource();
  const [target, setTarget] = useState<ImageType>("image/webp");
  const [quality, setQuality] = useState(90);
  // WebP is the default because it makes the smallest files, but a browser that cannot create it starts on JPG instead.
  useEffect(() => {
    void canEncode("image/webp").then((ok) => ok || setTarget((t) => (t === "image/webp" ? "image/jpeg" : t)));
  }, []);
  const { encoded, busy, error } = useEncoded(source, source && { width: source.bitmap.width, height: source.bitmap.height, type: target, quality: quality / 100 });

  return (
    <ToolLayout
      inputs={
        <>
          <FilePicker onChoose={choose} error={sourceError} />
          <SelectField label="Convert to" value={target} onChange={setTarget} options={IMAGE_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} />
          <RangeField label="Quality" value={quality} onChange={setQuality} disabled={!isLossy(target)} />
          {target === "image/jpeg" && <p className="text-sm text-slate-700">JPG has no transparency, so transparent areas become white.</p>}
        </>
      }
      results={<ImageOutput source={source} encoded={encoded} busy={busy} error={error} suffix="converted" outType={target} emptyMessage="Choose an image to convert it." />}
    />
  );
}
