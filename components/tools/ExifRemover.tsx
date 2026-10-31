"use client";

import { useState } from "react";
import { checkImageFile, formatBytes } from "../../lib/tools/image";
import { detectFormat, inspectImage, stripMetadata, type Inspection } from "../../lib/tools/metadata";
import { DownloadLink, FilesInput, readBytes, toBlob } from "./fileShared";
import { useReportResult } from "./ToolEvents";
import { ToolLayout } from "./ui";

interface Done {
  id: number;
  name: string;
  size: number;
  found: Inspection;
  clean: Blob;
  cleanName: string;
}
let nextId = 1;
const MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
const EXT = { jpeg: "jpg", png: "png", webp: "webp" } as const;
const MAX_FILES = 20;

export default function ExifRemover() {
  const [done, setDone] = useState<Done[]>([]);
  const [keepUpright, setKeepUpright] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useReportResult(done.length > 0);

  async function run(chosen: File[], upright: boolean) {
    setBusy(true);
    const problems: string[] = [];
    const out: Done[] = [];
    for (const file of chosen.slice(0, MAX_FILES)) {
      const problem = checkImageFile(file);
      if (problem) {
        problems.push(`${file.name}: ${problem}`);
        continue;
      }
      try {
        const bytes = await readBytes(file);
        const format = detectFormat(bytes);
        const found = inspectImage(bytes);
        if (!format || !found) {
          problems.push(`${file.name}: this is not a standard JPG, PNG or WebP file, or it is damaged.`);
          continue;
        }
        const clean = stripMetadata(bytes, { keepOrientation: upright });
        const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w.\- ]+/g, "_") || "image";
        out.push({ id: nextId++, name: file.name, size: file.size, found, clean: toBlob(clean, MIME[format]), cleanName: `${base}-clean.${EXT[format]}` });
      } catch {
        problems.push(`${file.name}: this file could not be cleaned. It may be damaged.`);
      }
    }
    if (chosen.length > MAX_FILES) problems.push(`Only the first ${MAX_FILES} files were used.`);
    setDone(out);
    setErrors(problems);
    setBusy(false);
  }

  return (
    <ToolLayout
      inputs={
        <>
          <FilesInput label="Choose pictures (JPG, PNG or WebP)" accept="image/jpeg,image/png,image/webp" multiple onFiles={(f) => { setFiles(f); void run(f, keepUpright); }} />
          <label className="flex items-start gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={keepUpright}
              onChange={(e) => {
                setKeepUpright(e.target.checked);
                if (files.length) void run(files, e.target.checked);
              }}
              className="mt-1"
            />
            <span>
              Keep photos upright
              <span className="block text-xs font-normal text-slate-600">JPG photos taken sideways store a rotation note. Keeping only that note stops them from opening on their side. Nothing else about the photo is kept.</span>
            </span>
          </label>
          {busy && <p className="text-sm text-muted">Working…</p>}
          {errors.length > 0 && (
            <ul role="alert" className="space-y-1 text-sm text-red-800">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </>
      }
      results={
        done.length > 0 ? (
          <ul className="space-y-5">
            {done.map((d) => (
              <li key={d.id} className="space-y-2">
                <p className="break-all font-medium text-ink">{d.name}</p>
                {d.found.findings.length > 0 ? (
                  <>
                    <p className="text-sm text-ink">Removed:</p>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink">
                      {d.found.findings.map((f, i) => (
                        <li key={i}>{f.label}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-ink">No hidden data found in this file.</p>
                )}
                <p className="text-xs text-muted">
                  {formatBytes(d.size)} before, {formatBytes(d.clean.size)} after. The picture itself is unchanged.
                </p>
                <DownloadLink blob={d.clean} name={d.cleanName} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Choose pictures to see what is hidden inside them, and download copies with it removed.</p>
        )
      }
    />
  );
}
