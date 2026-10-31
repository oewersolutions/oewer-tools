"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ASPECTS, clampRect, dragCorner, IDENTITY, initialRect, moveRect, rotate, setRectField, transformMatrix, turnedSize, type Corner, type Rect, type RectField, type Transform } from "../../lib/tools/crop";
import { isLossy } from "../../lib/tools/image";
import { FilePicker, ImageOutput, RangeField, useEncoded, useImageSource } from "./imageShared";
import { NumberField, SelectField, ToolLayout } from "./ui";

const button = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50";
const HANDLES: { corner: Corner; at: string }[] = [
  { corner: "nw", at: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { corner: "ne", at: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { corner: "sw", at: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { corner: "se", at: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
];
const FIELDS: { field: RectField; label: string }[] = [
  { field: "x", label: "Left (px)" },
  { field: "y", label: "Top (px)" },
  { field: "width", label: "Width (px)" },
  { field: "height", label: "Height (px)" },
];

export default function ImageCropRotate() {
  const { source, error: sourceError, choose } = useImageSource();
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [aspectId, setAspectId] = useState("free");
  const [crop, setCropRaw] = useState<Rect>({ x: 0, y: 0, width: 1, height: 1 });
  const [quality, setQuality] = useState(92);
  // What is being typed into a box, so it can be cleared and retyped; any other change to the crop replaces it.
  const [typed, setTyped] = useState<Partial<Record<RectField, string>>>({});
  const setCrop = (r: Rect | ((current: Rect) => Rect)) => {
    setTyped({});
    setCropRaw(r);
  };
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "move" | Corner; startX: number; startY: number; rect: Rect } | null>(null);

  const ratio = ASPECTS.find((a) => a.id === aspectId)?.ratio;
  const size = source ? turnedSize(source.bitmap.width, source.bitmap.height, transform.rotation) : { width: 1, height: 1 };

  async function onChoose(file: File | undefined) {
    const next = await choose(file);
    if (next) {
      setTransform(IDENTITY);
      setAspectId("free");
      setCrop({ x: 0, y: 0, width: next.bitmap.width, height: next.bitmap.height });
    }
  }

  /** Turning or flipping starts the crop again, because the old box would point at a different part of the picture. */
  function change(next: Transform) {
    if (!source) return;
    const s = turnedSize(source.bitmap.width, source.bitmap.height, next.rotation);
    setTransform(next);
    setCrop(initialRect(s.width, s.height, ratio));
  }

  function chooseAspect(id: string) {
    setAspectId(id);
    const r = ASPECTS.find((a) => a.id === id)?.ratio;
    setCrop(initialRect(size.width, size.height, r));
  }

  // Draw the turned picture behind the crop box.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !source) return;
    const scale = Math.min(1, 900 / Math.max(size.width, size.height));
    c.width = Math.max(1, Math.round(size.width * scale));
    c.height = Math.max(1, Math.round(size.height * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const [a, b, cc, d, e, f] = transformMatrix(source.bitmap.width, source.bitmap.height, transform);
    ctx.setTransform(a * scale, b * scale, cc * scale, d * scale, e * scale, f * scale);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source.bitmap, 0, 0);
  }, [source, transform, size.width, size.height]);

  function toImagePoint(e: PointerEvent) {
    const box = stage.current!.getBoundingClientRect();
    return { x: ((e.clientX - box.left) / box.width) * size.width, y: ((e.clientY - box.top) / box.height) * size.height };
  }
  function start(kind: "move" | Corner, e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = toImagePoint(e);
    drag.current = { kind, startX: p.x, startY: p.y, rect: crop };
  }
  function moveDrag(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = toImagePoint(e);
    if (d.kind === "move") setCrop(moveRect(d.rect, p.x - d.startX, p.y - d.startY, size.width, size.height));
    else setCrop(dragCorner(d.rect, d.kind, p.x, p.y, size.width, size.height, ratio));
  }
  function key(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    setCrop((r) => moveRect(r, d[0], d[1], size.width, size.height));
  }

  const crop_ = clampRect(crop, size.width, size.height);
  const percent = (n: number, of: number) => `${(n / of) * 100}%`;
  const edited = transform.rotation !== 0 || transform.flipH || transform.flipV || crop_.x !== 0 || crop_.y !== 0 || crop_.width !== size.width || crop_.height !== size.height;
  const { encoded, busy, error } = useEncoded(source, source && { width: crop_.width, height: crop_.height, type: source.type, quality: quality / 100, edit: { transform, crop: crop_ } });

  return (
    <ToolLayout
      inputs={
        <>
          <FilePicker onChoose={onChoose} error={sourceError} />
          <fieldset disabled={!source} className="space-y-4">
            <legend className="text-sm font-semibold text-slate-800">Turn and flip</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} onClick={() => change({ ...transform, rotation: rotate(transform.rotation, -90) })}>
                Rotate left
              </button>
              <button type="button" className={button} onClick={() => change({ ...transform, rotation: rotate(transform.rotation, 90) })}>
                Rotate right
              </button>
              <button type="button" className={button} aria-pressed={transform.flipH} onClick={() => change({ ...transform, flipH: !transform.flipH })}>
                Flip left-right
              </button>
              <button type="button" className={button} aria-pressed={transform.flipV} onClick={() => change({ ...transform, flipV: !transform.flipV })}>
                Flip top-bottom
              </button>
            </div>
          </fieldset>
          <fieldset disabled={!source} className="space-y-4">
            <legend className="text-sm font-semibold text-slate-800">Crop</legend>
            <SelectField label="Shape" value={aspectId} onChange={chooseAspect} options={ASPECTS.map((a) => ({ value: a.id, label: a.label }))} />
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(({ field, label }) => (
                <NumberField
                  key={field}
                  label={label}
                  value={typed[field] ?? String(crop_[field])}
                  onChange={(v) => {
                    if (/^\d+$/.test(v.trim())) setCropRaw(setRectField(crop_, field, Number(v), size.width, size.height, ratio));
                    setTyped({ [field]: v });
                  }}
                />
              ))}
            </div>
            <button type="button" className={button} onClick={() => setCrop(initialRect(size.width, size.height, ratio))}>
              Reset crop
            </button>
          </fieldset>
          {source && isLossy(source.type) && <RangeField label="Quality" value={quality} onChange={setQuality} />}
          <p className="text-sm text-muted">Drag the box on the picture, or type the numbers. The arrow keys move the box when it has focus (hold Shift for bigger steps).</p>
        </>
      }
      results={
        <div className="space-y-5">
          {source && (
            <div>
              <div ref={stage} className="relative mx-auto w-full max-w-xl touch-none select-none overflow-hidden rounded-lg bg-slate-200">
                <canvas ref={canvas} className="block h-auto w-full" aria-label="The picture, turned as you chose" role="img" />
                <div
                  role="group"
                  tabIndex={0}
                  aria-label={`Crop area: ${crop_.width} by ${crop_.height} pixels, from ${crop_.x} across and ${crop_.y} down`}
                  onKeyDown={key}
                  onPointerDown={(e) => start("move", e)}
                  onPointerMove={moveDrag}
                  onPointerUp={() => (drag.current = null)}
                  onPointerCancel={() => (drag.current = null)}
                  className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                  style={{ left: percent(crop_.x, size.width), top: percent(crop_.y, size.height), width: percent(crop_.width, size.width), height: percent(crop_.height, size.height) }}
                >
                  {HANDLES.map(({ corner, at }) => (
                    <span key={corner} aria-hidden="true" onPointerDown={(e) => start(corner, e)} onPointerMove={moveDrag} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)} className={`absolute h-5 w-5 rounded-full border-2 border-white bg-brand ${at}`} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <ImageOutput
            source={source}
            encoded={edited ? encoded : null}
            busy={busy}
            error={error}
            suffix="edited"
            outType={source?.type ?? "image/jpeg"}
            note={edited ? "Saved again with the quality shown. Hidden camera and location data is not kept." : undefined}
            emptyMessage="Choose an image to turn, flip or crop it."
          />
          {source && !edited && <p className="text-sm text-muted">Turn, flip or crop the picture to get a new file.</p>}
        </div>
      }
    />
  );
}
