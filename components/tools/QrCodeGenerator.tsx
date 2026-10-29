"use client";

import { useMemo, useState } from "react";
import { buildQr, MAX_QR_CHARS, qrSvg, type ErrorCorrection } from "../../lib/tools/qr";
import { SelectField, TextAreaField, ToolLayout } from "./ui";

const COLORS = { black: "#000000", green: "#174f49" } as const;
const MARGIN = 4;

export default function QrCodeGenerator() {
  const [text, setText] = useState("https://");
  const [level, setLevel] = useState<ErrorCorrection>("M");
  const [size, setSize] = useState("512");
  const [color, setColor] = useState<keyof typeof COLORS>("black");

  const qr = useMemo(() => buildQr(text.trim() === "https://" ? "" : text, level), [text, level]);
  const px = Number(size);
  const style = { size: px, margin: MARGIN, foreground: COLORS[color], background: "#ffffff" };
  const svg = qr.ok ? qrSvg(qr.modules, style) : "";

  function downloadSvg() {
    save(new Blob([svg], { type: "image/svg+xml" }), "qr-code.svg");
  }

  function downloadPng() {
    if (!qr.ok) return;
    const total = qr.modules.length + MARGIN * 2;
    const cell = Math.max(1, Math.floor(px / total));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = cell * total; // whole pixels per module keeps the edges sharp
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = style.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = style.foreground;
    qr.modules.forEach((row, r) => row.forEach((dark, c) => dark && ctx.fillRect((c + MARGIN) * cell, (r + MARGIN) * cell, cell, cell)));
    canvas.toBlob((blob) => blob && save(blob, "qr-code.png"), "image/png");
  }

  return (
    <ToolLayout
      inputs={
        <>
          <TextAreaField label="Text or link" value={text} onChange={setText} rows={4} placeholder="https://example.com" />
          <p className="text-xs text-slate-600">Up to {MAX_QR_CHARS} characters.</p>
          <SelectField
            label="Error correction"
            value={level}
            onChange={setLevel}
            options={[
              { value: "L", label: "Low (smallest code)" },
              { value: "M", label: "Medium (recommended)" },
              { value: "Q", label: "Quartile" },
              { value: "H", label: "High (survives damage)" },
            ]}
          />
          <SelectField
            label="Image size"
            value={size}
            onChange={setSize}
            options={[
              { value: "256", label: "256 px" },
              { value: "512", label: "512 px" },
              { value: "1024", label: "1024 px" },
            ]}
          />
          <SelectField
            label="Colour"
            value={color}
            onChange={setColor}
            options={[
              { value: "black", label: "Black" },
              { value: "green", label: "Dark green" },
            ]}
          />
        </>
      }
      results={
        qr.ok ? (
          <div className="space-y-3">
            {/* A data URL image: the SVG is generated here from numbers and fixed colours only. */}
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="QR code for your text" width={256} height={256} className="h-auto max-w-full rounded-xl border border-brand-200" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={downloadPng} className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white shadow-soft transition hover:bg-brand-700">
                Download PNG
              </button>
              <button type="button" onClick={downloadSvg} className="rounded-xl border border-brand px-5 py-2.5 font-medium text-brand transition hover:bg-brand-50">
                Download SVG
              </button>
            </div>
            <p className="text-sm text-slate-700">Test the code with your phone before printing it.</p>
          </div>
        ) : qr.error ? (
          <p role="alert" className="text-red-800">
            {qr.error}
          </p>
        ) : (
          <p className="text-slate-700">Type or paste text or a link to make a QR code.</p>
        )
      }
    />
  );
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
