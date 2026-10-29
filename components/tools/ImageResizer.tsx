"use client";

import { useState } from "react";
import { heightForWidth, readDimension, scaleByPercent, widthForHeight } from "../../lib/tools/image";
import { FilePicker, ImageOutput, useEncoded, useImageSource } from "./imageShared";
import { NumberField, SelectField, ToolLayout } from "./ui";

type Mode = "pixels" | "percent";

export default function ImageResizer() {
  const { source, error: sourceError, choose } = useImageSource();
  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [percent, setPercent] = useState("50");
  const [lock, setLock] = useState(true);

  const nw = source?.bitmap.width ?? 1;
  const nh = source?.bitmap.height ?? 1;

  async function onChoose(file: File | undefined) {
    const next = await choose(file);
    if (next) {
      setWidth(String(next.bitmap.width));
      setHeight(String(next.bitmap.height));
    }
  }

  const w = readDimension(width, "Width");
  const h = readDimension(height, "Height");
  const p = readDimension(percent, "Percentage");
  const size =
    mode === "percent"
      ? "value" in p && p.value <= 400
        ? scaleByPercent(nw, nh, p.value)
        : null
      : "value" in w && "value" in h
        ? { width: w.value, height: h.value }
        : null;
  const { encoded, busy, error } = useEncoded(source, source && size && { ...size, type: source.type, quality: 0.92 });

  return (
    <ToolLayout
      inputs={
        <>
          <FilePicker onChoose={onChoose} error={sourceError} />
          <SelectField
            label="Resize by"
            value={mode}
            onChange={setMode}
            options={[
              { value: "pixels", label: "Width and height (pixels)" },
              { value: "percent", label: "Percentage of original" },
            ]}
          />
          {mode === "pixels" ? (
            <>
              <NumberField
                label="Width (px)"
                value={width}
                onChange={(v) => {
                  setWidth(v);
                  const r = readDimension(v, "Width");
                  if (lock && "value" in r) setHeight(String(heightForWidth(nw, nh, r.value)));
                }}
                error={"error" in w ? w.error : undefined}
              />
              <NumberField
                label="Height (px)"
                value={height}
                onChange={(v) => {
                  setHeight(v);
                  const r = readDimension(v, "Height");
                  if (lock && "value" in r) setWidth(String(widthForHeight(nw, nh, r.value)));
                }}
                error={"error" in h ? h.error : undefined}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} />
                Keep the original proportions
              </label>
            </>
          ) : (
            <NumberField label="Percentage of original size" value={percent} onChange={setPercent} error={"error" in p ? p.error : "value" in p && p.value > 400 ? "Percentage cannot be more than 400." : undefined} />
          )}
        </>
      }
      results={
        <ImageOutput
          source={source}
          encoded={encoded}
          busy={busy}
          error={error}
          suffix="resized"
          outType={source?.type ?? "image/jpeg"}
          emptyMessage="Choose an image to resize it."
        />
      }
    />
  );
}
