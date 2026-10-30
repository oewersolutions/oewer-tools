"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { checkImageFile, checkImageSize, formatBytes, outputName, savedPercent, type ImageType } from "../../lib/tools/image";
import { useReportResult } from "./ToolEvents";
import { decodeImage, encodeImage, type EncodeOptions } from "../../lib/tools/image-canvas";

export interface ImageSource {
  file: File;
  bitmap: ImageBitmap;
  type: ImageType;
}

/** The chosen image, decoded in the browser. Errors are shown to the visitor, never thrown. */
export function useImageSource() {
  const [source, setSource] = useState<ImageSource | null>(null);
  const [error, setError] = useState<string>();
  const latest = useRef<ImageSource | null>(null);

  useEffect(() => () => latest.current?.bitmap.close(), []);

  /** Resolves to the new source, or undefined when the file was rejected (the reason is in `error`). */
  async function choose(file: File | undefined): Promise<ImageSource | undefined> {
    if (!file) return undefined;
    const problem = checkImageFile(file);
    if (problem) return void setError(problem);
    try {
      const bitmap = await decodeImage(file);
      const tooBig = checkImageSize(bitmap.width, bitmap.height);
      if (tooBig) {
        bitmap.close();
        return void setError(tooBig);
      }
      latest.current?.bitmap.close();
      const next = { file, bitmap, type: file.type as ImageType };
      latest.current = next;
      setError(undefined);
      setSource(next);
      return next;
    } catch {
      setError("That file could not be read as an image. It may be damaged.");
      return undefined;
    }
  }

  return { source, error, choose };
}

export interface Encoded {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

/** Re-encodes whenever the options change; a newer request replaces an older one. */
export function useEncoded(source: ImageSource | null, options: EncodeOptions | null) {
  const [encoded, setEncoded] = useState<Encoded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const { width, height, type, quality } = options ?? { width: 0, height: 0, type: "image/png" as ImageType, quality: 1 };
  const ready = source !== null && options !== null;

  useEffect(() => {
    if (!ready) {
      setEncoded(null);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const timer = setTimeout(() => {
      encodeImage(source.bitmap, { width, height, type, quality })
        .then((blob) => {
          if (cancelled) return;
          setError(undefined);
          setEncoded({ blob, url: URL.createObjectURL(blob), width, height });
        })
        .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Something went wrong."))
        .finally(() => !cancelled && setBusy(false));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, source, width, height, type, quality]);

  useEffect(() => () => void (encoded && URL.revokeObjectURL(encoded.url)), [encoded]);

  return { encoded: ready ? encoded : null, busy, error };
}

export function FilePicker({ onChoose, error }: { onChoose: (file: File | undefined) => unknown; error?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        Choose an image (JPG, PNG or WebP)
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          onChoose(e.target.files?.[0]);
          e.target.value = "";
        }}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        className="mt-1 block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white"
      />
      <p className="mt-1 text-xs text-slate-600">Your image stays on your device. It is never uploaded.</p>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

export function RangeField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}: {value}%
      </label>
      <input id={id} type="range" min={10} max={100} step={1} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-brand" />
    </div>
  );
}

/** Preview, size summary and download button for the processed image. */
export function ImageOutput({
  source,
  encoded,
  busy,
  error,
  suffix,
  outType,
  note,
  emptyMessage,
}: {
  source: ImageSource | null;
  encoded: Encoded | null;
  busy: boolean;
  error?: string;
  suffix: string;
  outType: ImageType;
  note?: ReactNode;
  emptyMessage: string;
}) {
  useReportResult(encoded !== null && encoded !== undefined);
  if (!source) return <p className="text-slate-700">{emptyMessage}</p>;
  const saved = encoded ? savedPercent(source.file.size, encoded.blob.size) : 0;
  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {encoded && (
        // A plain <img>: this is a local blob URL, which next/image cannot optimise.
        <img src={encoded.url} alt="Preview of the processed image" className="max-h-72 w-auto max-w-full rounded-xl border border-brand-200 bg-white object-contain" />
      )}
      <dl className="space-y-2 text-sm">
        <Row label="Original" value={`${formatBytes(source.file.size)} · ${source.bitmap.width} × ${source.bitmap.height}`} />
        {encoded && (
          <>
            <Row label="New file" value={`${formatBytes(encoded.blob.size)} · ${encoded.width} × ${encoded.height}`} />
            <Row label={saved >= 0 ? "Smaller by" : "Larger by"} value={`${Math.abs(saved).toFixed(1)}%`} />
          </>
        )}
      </dl>
      {busy && <p className="text-sm text-slate-700">Working…</p>}
      {note}
      {encoded && (
        <a
          href={encoded.url}
          download={outputName(source.file.name, outType, suffix)}
          className="inline-block rounded-xl bg-brand px-5 py-2.5 font-medium text-white shadow-soft transition hover:bg-brand-700"
        >
          Download image
        </a>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-brand-200 pt-2">
      <dt className="text-slate-700">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
