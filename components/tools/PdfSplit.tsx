"use client";

import { useState } from "react";
import { checkPdfFile, parseSplitGroups, pdfOutputName } from "../../lib/tools/pdf";
import { formatBytes } from "../../lib/tools/image";
import { countPages, extractPages, PdfProblem } from "../../lib/tools/pdf-ops";
import { DownloadLink, FilesInput, readBytes, toBlob } from "./fileShared";
import { useReportResult } from "./ToolEvents";
import { TextAreaField, ToolLayout } from "./ui";

interface Output {
  label: string;
  blob: Blob;
  pages: number;
}

export default function PdfSplit() {
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; pages: number }>();
  const [ranges, setRanges] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [outputs, setOutputs] = useState<Output[]>([]);
  useReportResult(outputs.length > 0);

  async function choose(files: File[]) {
    const f = files[0];
    if (!f) return;
    setOutputs([]);
    const problem = checkPdfFile(f);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      const bytes = await readBytes(f);
      const pages = await countPages(bytes, f.name);
      setFile({ name: f.name, bytes, pages });
      setError(undefined);
    } catch (e) {
      setError(e instanceof PdfProblem ? e.message : `"${f.name}" could not be read.`);
    } finally {
      setBusy(false);
    }
  }

  async function split() {
    if (!file) return;
    setOutputs([]);
    const parsed = parseSplitGroups(ranges, file.pages);
    if (!parsed.ok) return setError(parsed.error);
    setError(undefined);
    setBusy(true);
    try {
      const made: Output[] = [];
      for (const g of parsed.groups) {
        const bytes = await extractPages(file.bytes, g.pages, file.name);
        made.push({ label: g.label, blob: toBlob(bytes, "application/pdf"), pages: g.pages.length });
      }
      setOutputs(made);
    } catch (e) {
      setError(e instanceof PdfProblem ? e.message : "The pages could not be extracted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolLayout
      inputs={
        <>
          <FilesInput label="Choose a PDF file" accept="application/pdf,.pdf" onFiles={(f) => void choose(f)} />
          {file && (
            <p className="text-sm text-ink">
              <span className="font-medium break-all">{file.name}</span> has {file.pages} page{file.pages === 1 ? "" : "s"}.
            </p>
          )}
          <div>
            <TextAreaField label="Pages for each new file (one file per line)" value={ranges} onChange={setRanges} rows={5} mono placeholder={"1-3\n4-6\n7-"} describedBy="split-help" />
            <p id="split-help" className="mt-1 text-xs text-slate-600">
              Each line becomes its own PDF. Use page numbers and ranges such as 1-3, 5, 8- (8- means page 8 to the end).
            </p>
          </div>
          <button type="button" onClick={() => void split()} disabled={busy || !file} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
            {busy ? "Working…" : "Make the files"}
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </>
      }
      results={
        outputs.length > 0 && file ? (
          <ul className="space-y-3">
            {outputs.map((o) => (
              <li key={o.label} className="space-y-1">
                <p className="text-sm text-ink">
                  Pages {o.label}: {o.pages} page{o.pages === 1 ? "" : "s"}, {formatBytes(o.blob.size)}
                </p>
                <DownloadLink blob={o.blob} name={pdfOutputName(file.name, `pages ${o.label}`)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Choose a PDF, say which pages go in each new file, then press the button.</p>
        )
      }
    />
  );
}
