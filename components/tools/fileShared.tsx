"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/** The bytes of a chosen file. */
export async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Plain data to a Blob. Copies the bytes so the Blob owns a regular buffer. */
export const toBlob = (bytes: Uint8Array, type: string): Blob => new Blob([bytes.slice().buffer], { type });

/** A download link for a file made in the browser. The temporary address is released when the link goes away. */
export function DownloadLink({ blob, name, children }: { blob: Blob; name: string; children?: ReactNode }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return null;
  return (
    <a href={url} download={name} className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700">
      {children ?? `Download ${name}`}
    </a>
  );
}

export interface ListedFile {
  id: number;
  name: string;
  size: number;
}

const small = "rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-40";

/** A numbered list of chosen files that can be reordered and removed. */
export function FileList({ files, onMove, onRemove, describe }: { files: ListedFile[]; onMove: (from: number, to: number) => void; onRemove: (id: number) => void; describe?: (f: ListedFile) => string }) {
  if (files.length === 0) return null;
  return (
    <ol className="space-y-2" aria-label="Chosen files">
      {files.map((f, i) => (
        <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm">
          <span className="w-6 text-muted">{i + 1}.</span>
          <span className="min-w-0 flex-1 break-all font-medium text-ink">
            {f.name}
            {describe && <span className="ml-2 font-normal text-muted">{describe(f)}</span>}
          </span>
          <button type="button" className={small} disabled={i === 0} onClick={() => onMove(i, i - 1)} aria-label={`Move ${f.name} up`}>
            Up
          </button>
          <button type="button" className={small} disabled={i === files.length - 1} onClick={() => onMove(i, i + 1)} aria-label={`Move ${f.name} down`}>
            Down
          </button>
          <button type="button" className={small} onClick={() => onRemove(f.id)} aria-label={`Remove ${f.name}`}>
            Remove
          </button>
        </li>
      ))}
    </ol>
  );
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function FilesInput({ label, accept, multiple, onFiles, hint }: { label: string; accept: string; multiple?: boolean; onFiles: (files: File[]) => void; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
        className="mt-1.5 block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white"
      />
      <p className="mt-1 text-xs text-slate-600">{hint ?? "Your files stay on your device. They are never uploaded."}</p>
    </div>
  );
}
