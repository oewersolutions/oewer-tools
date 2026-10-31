"use client";

import { useEffect, useId, useRef, useState } from "react";
import { commitFiles, GithubError, repoPathForSitePath, type GithubSession } from "../../../lib/admin/github";
import { checkPicked, describeBytes, extensionFor, prepareImage, shortHash, sitePathFor, type PictureKind, type PreparedFile } from "../../../lib/admin/images";
import { canEncode } from "../../../lib/tools/image-canvas";

type State = { phase: "idle" } | { phase: "working"; message: string } | { phase: "done"; files: PreparedFile[]; previewUrl: string; commitUrl: string } | { phase: "error"; message: string };

/**
 * Choose a picture, have it resized and compressed in the browser, and save it to the repository in one commit, then
 * hand back the address of the full-size copy. The picture is never sent anywhere except GitHub, and only after it
 * has been shrunk here. The smaller copy is saved next to it so phones can use it.
 */
export default function ImageUpload({
  kind,
  slug,
  session,
  canPush,
  label,
  onUploaded,
}: {
  kind: PictureKind;
  /** The article's address; pictures are saved in a folder named after it. */
  slug: string;
  session: GithubSession;
  canPush: boolean;
  label: string;
  /** Called with the site path of the full-size picture once it is saved. */
  onUploaded: (path: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ phase: "idle" });
  const previewUrl = state.phase === "done" ? state.previewUrl : undefined;

  // Release the temporary preview address when it is replaced or the form closes.
  useEffect(() => () => (previewUrl ? URL.revokeObjectURL(previewUrl) : undefined), [previewUrl]);

  const blocked = !canPush ? "This token can only read the repository, so pictures cannot be saved." : !slug ? "Give the article a title (and so an address) first: its pictures are saved in a folder with that name." : "";

  async function onPick(file: File | undefined) {
    if (!file) return;
    setState({ phase: "working", message: "Checking the picture…" });
    try {
      const picked = checkPicked(file, new Uint8Array(await file.arrayBuffer()));
      if (!picked.ok) return setState({ phase: "error", message: picked.message });

      setState({ phase: "working", message: "Resizing and compressing it in your browser…" });
      const files = await prepareImage(file, kind, { webp: await canEncode("image/webp") });
      const hash = await shortHash(files[0]!.bytes);
      const named = files.map((f) => ({ file: f, path: sitePathFor({ slug, kind, fileName: file.name, hash, width: f.width, extension: extensionFor(f.type) }) }));

      setState({ phase: "working", message: "Saving to GitHub…" });
      const commit = await commitFiles(
        session,
        named.map((n) => ({ path: repoPathForSitePath(n.path), bytes: n.file.bytes })),
        `Admin: add ${kind === "cover" ? "cover" : "picture"} for ${slug}`,
      );
      const full = named.find((n) => n.file.role === "full")!;
      setState({ phase: "done", files, previewUrl: URL.createObjectURL(full.file.blob), commitUrl: commit.commitUrl });
      onUploaded(full.path);
    } catch (e) {
      setState({ phase: "error", message: e instanceof GithubError ? e.message : e instanceof Error ? e.message : "The picture could not be processed." });
    } finally {
      if (input.current) input.current.value = ""; // so the same file can be chosen again
    }
  }

  const working = state.phase === "working";
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-brand-200 p-3">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={Boolean(blocked) || working}
        aria-describedby={`${id}-note`}
        onChange={(e) => void onPick(e.target.files?.[0])}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white disabled:opacity-50"
      />
      <p id={`${id}-note`} className="text-xs text-slate-700">
        {blocked || "JPG, PNG or WebP. It is resized and compressed in your browser, then saved to the site's repository. Only use pictures you own or are licensed to use."}
      </p>
      <p role="status" className="text-sm text-slate-800">
        {working && state.message}
      </p>
      {state.phase === "error" && (
        <p role="alert" className="text-sm text-red-800">
          {state.message}
        </p>
      )}
      {state.phase === "done" && (
        <div className="flex flex-wrap items-start gap-4">
          {/* A temporary preview of the resized picture, from memory; not a request to any server. */}
          <img src={state.previewUrl} alt="Preview of the saved picture" className="h-24 w-auto max-w-[12rem] rounded-lg border border-brand-100 object-cover" />
          <div className="text-sm text-slate-800">
            <p className="font-medium text-brand">Saved. The picture appears on the site after its next update.</p>
            <ul className="mt-1 text-xs text-slate-700">
              {state.files.map((f) => (
                <li key={f.role}>
                  {f.role === "full" ? "Full size" : "Small copy for phones"}: {f.width} × {f.height}, {describeBytes(f.bytes.length)}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs">
              <a href={state.commitUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
                View the commit on GitHub
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
