"use client";

import { useState } from "react";
import { isLossy, TYPE_LABELS, type ImageType } from "../../lib/tools/image";
import { FilePicker, ImageOutput, RangeField, useEncoded, useImageSource } from "./imageShared";
import { SelectField, ToolLayout } from "./ui";

type Choice = "same" | "image/jpeg" | "image/webp";

export default function ImageCompressor() {
  const { source, error: sourceError, choose } = useImageSource();
  const [quality, setQuality] = useState(75);
  const [choice, setChoice] = useState<Choice>("same");
  const outType: ImageType = choice === "same" ? (source?.type ?? "image/jpeg") : choice;
  const { encoded, busy, error } = useEncoded(source, source && { width: source.bitmap.width, height: source.bitmap.height, type: outType, quality: quality / 100 });

  return (
    <ToolLayout
      inputs={
        <>
          <FilePicker onChoose={choose} error={sourceError} />
          <SelectField
            label="Output format"
            value={choice}
            onChange={setChoice}
            options={[
              { value: "same", label: `Same as original${source ? ` (${TYPE_LABELS[source.type]})` : ""}` },
              { value: "image/jpeg", label: "JPG" },
              { value: "image/webp", label: "WebP" },
            ]}
          />
          <RangeField label="Quality" value={quality} onChange={setQuality} disabled={!isLossy(outType)} />
          {!isLossy(outType) && <p className="text-sm text-slate-700">PNG is lossless, so quality has no effect. Choose JPG or WebP for a much smaller file.</p>}
        </>
      }
      results={
        <ImageOutput
          source={source}
          encoded={encoded}
          busy={busy}
          error={error}
          suffix="compressed"
          outType={outType}
          emptyMessage="Choose an image to compress it."
          note={encoded && source && encoded.blob.size >= source.file.size ? <p className="text-sm text-slate-700">This version is not smaller. Lower the quality or try WebP.</p> : undefined}
        />
      }
    />
  );
}
