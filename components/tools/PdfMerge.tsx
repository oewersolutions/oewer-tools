"use client";

import { useState } from "react";
import { checkPdfFile, MAX_FILES, MAX_TOTAL_BYTES, pdfOutputName } from "../../lib/tools/pdf";
import { formatBytes } from "../../lib/tools/image";
import { countPages, mergePdfs, PdfProblem } from "../../lib/tools/pdf-ops";
import { DownloadLink, FileList, FilesInput, moveItem, readBytes, toBlob } from "./fileShared";
import { useReportResult } from "./ToolEvents";
import { ToolLayout } from "./ui";

interface Item {
  id: number;
  name: string;
  size: number;
  pages: number;
  bytes: Uint8Array;
}
let nextId = 1;

export default function PdfMerge() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; pages: number }>();
  useReportResult(Boolean(result));

  const total = items.reduce((n, i) => n + i.size, 0);

  async function add(files: File[]) {
    setResult(undefined);
    setError(undefined);
    setBusy(true);
    const added: Item[] = [];
    let running = total;
    for (const file of files) {
      if (items.length + added.length >= MAX_FILES) {
        setError(`You can merge up to ${MAX_FILES} files at a time.`);
        break;
      }
      const problem = checkPdfFile(file);
      if (problem) {
        setError(problem);
        continue;
      }
      if (running + file.size > MAX_TOTAL_BYTES) {
        setError("These files are too large to merge in a browser (150 MB in total is the limit).");
        break;
      }
      try {
        const bytes = await readBytes(file);
        const pages = await countPages(bytes, file.name);
        added.push({ id: nextId++, name: file.name, size: file.size, pages, bytes });
        running += file.size;
      } catch (e) {
        setError(e instanceof PdfProblem ? e.message : `"${file.name}" could not be read.`);
      }
    }
    setItems((list) => [...list, ...added]);
    setBusy(false);
  }

  async function merge() {
    setError(undefined);
    setBusy(true);
    try {
      const merged = await mergePdfs(items.map((i) => ({ name: i.name, bytes: i.bytes })));
      setResult({ blob: toBlob(merged.bytes, "application/pdf"), pages: merged.pages });
    } catch (e) {
      setError(e instanceof PdfProblem ? e.message : "The files could not be merged.");
    } finally {
      setBusy(false);
    }
  }

  const changed = <T,>(fn: () => T): T => {
    setResult(undefined);
    return fn();
  };

  return (
    <ToolLayout
      inputs={
        <>
          <FilesInput label="Choose PDF files" accept="application/pdf,.pdf" multiple onFiles={(f) => void add(f)} />
          <FileList files={items} onMove={(a, b) => changed(() => setItems((l) => moveItem(l, a, b)))} onRemove={(id) => changed(() => setItems((l) => l.filter((i) => i.id !== id)))} describe={(f) => `${items.find((i) => i.id === f.id)!.pages} pages, ${formatBytes(f.size)}`} />
          <button type="button" onClick={() => void merge()} disabled={busy || items.length < 2} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
            {busy ? "Working…" : "Merge into one PDF"}
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
              Done: {result.pages} pages, {formatBytes(result.blob.size)}.
            </p>
            <DownloadLink blob={result.blob} name={pdfOutputName(items[0]?.name ?? "merged.pdf", "merged")} />
          </div>
        ) : (
          <p className="text-muted">{items.length < 2 ? "Choose at least two PDF files. Put them in the order you want, then merge." : "Put the files in the order you want, then press Merge."}</p>
        )
      }
    />
  );
}
