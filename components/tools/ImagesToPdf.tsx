"use client";

import { useState } from "react";
import { checkImageFile, formatBytes } from "../../lib/tools/image";
import { encodeImage, decodeImage } from "../../lib/tools/image-canvas";
import { detectFormat, inspectImage } from "../../lib/tools/metadata";
import type { PageSize } from "../../lib/tools/pdf";
import { imagesToPdf, PdfProblem, type PdfImage } from "../../lib/tools/pdf-ops";
import { DownloadLink, FileList, FilesInput, moveItem, readBytes, toBlob } from "./fileShared";
import { useReportResult } from "./ToolEvents";
import { SelectField, ToolLayout } from "./ui";

interface Item {
  id: number;
  name: string;
  size: number;
  file: File;
}
let nextId = 1;
const MAX_IMAGES = 50;

/** JPG and PNG go in as they are; WebP, and JPGs that need turning upright, are redrawn first. */
async function prepare(file: File): Promise<PdfImage> {
  const bytes = await readBytes(file);
  const format = detectFormat(bytes);
  if (format === "png") return { bytes, kind: "png" };
  if (format === "jpeg" && (inspectImage(bytes)?.exif?.orientation ?? 1) === 1) return { bytes, kind: "jpg" };
  const bitmap = await decodeImage(file);
  try {
    const isJpeg = format === "jpeg";
    const blob = await encodeImage(bitmap, { width: bitmap.width, height: bitmap.height, type: isJpeg ? "image/jpeg" : "image/png", quality: 0.92 });
    return { bytes: await readBytes(new File([blob], "x")), kind: isJpeg ? "jpg" : "png" };
  } finally {
    bitmap.close();
  }
}

export default function ImagesToPdf() {
  const [items, setItems] = useState<Item[]>([]);
  const [size, setSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState("36");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Blob>();
  useReportResult(Boolean(result));

  function add(files: File[]) {
    setResult(undefined);
    setError(undefined);
    const accepted: Item[] = [];
    for (const file of files) {
      const problem = checkImageFile(file);
      if (problem) setError(`${file.name}: ${problem}`);
      else if (items.length + accepted.length >= MAX_IMAGES) setError(`You can add up to ${MAX_IMAGES} pictures at a time.`);
      else accepted.push({ id: nextId++, name: file.name, size: file.size, file });
    }
    setItems((l) => [...l, ...accepted]);
  }

  async function make() {
    setError(undefined);
    setBusy(true);
    try {
      const prepared: PdfImage[] = [];
      for (const item of items) prepared.push(await prepare(item.file));
      setResult(toBlob(await imagesToPdf(prepared, size, Number(margin)), "application/pdf"));
    } catch (e) {
      setError(e instanceof PdfProblem ? e.message : "One of the pictures could not be added. It may be damaged.");
    } finally {
      setBusy(false);
    }
  }
  const changed = (fn: () => void) => {
    setResult(undefined);
    fn();
  };

  return (
    <ToolLayout
      inputs={
        <>
          <FilesInput label="Choose pictures (JPG, PNG or WebP)" accept="image/jpeg,image/png,image/webp" multiple onFiles={add} />
          <FileList files={items} onMove={(a, b) => changed(() => setItems((l) => moveItem(l, a, b)))} onRemove={(id) => changed(() => setItems((l) => l.filter((i) => i.id !== id)))} describe={(f) => formatBytes(f.size)} />
          <SelectField
            label="Page size"
            value={size}
            onChange={(v) => changed(() => setSize(v))}
            options={[
              { value: "a4", label: "A4 (picture centred on the page)" },
              { value: "letter", label: "US Letter (picture centred on the page)" },
              { value: "fit", label: "Same size as each picture" },
            ]}
          />
          {size !== "fit" && (
            <SelectField
              label="Margin"
              value={margin}
              onChange={(v) => changed(() => setMargin(v))}
              options={[
                { value: "0", label: "None" },
                { value: "18", label: "Small (6 mm)" },
                { value: "36", label: "Normal (13 mm)" },
              ]}
            />
          )}
          <button type="button" onClick={() => void make()} disabled={busy || items.length === 0} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
            {busy ? "Working…" : "Make the PDF"}
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </>
      }
      results={
        result ? (
          <div className="space-y-3">
            <p className="font-medium text-ink">
              Done: {items.length} page{items.length === 1 ? "" : "s"}, {formatBytes(result.size)}.
            </p>
            <DownloadLink blob={result} name="pictures.pdf" />
          </div>
        ) : (
          <p className="text-muted">Choose one or more pictures, put them in order, then make the PDF. Each picture gets its own page.</p>
        )
      }
    />
  );
}
