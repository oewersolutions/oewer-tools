"use client";

import { useState } from "react";
import { contrastAgainstWhiteAndBlack, parseColour, toHex, toHslString, toRgbString } from "../../lib/tools/colour";
import { useReportResult } from "./ToolEvents";
import { CopyButton } from "./ui";

const field = "mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition focus:border-brand-500 aria-[invalid=true]:border-red-700";
const pass = (ok: boolean) => (ok ? "Pass" : "Fail");

export default function ColourConverter() {
  const [text, setText] = useState("#1a73e8");
  const parsed = parseColour(text);
  useReportResult(parsed.ok);
  const colour = parsed.ok ? parsed.colour : undefined;
  const outputs: [string, string][] | undefined = colour && [
    ["HEX", toHex(colour)],
    ["RGB", toRgbString(colour)],
    ["HSL", toHslString(colour)],
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="panel space-y-5 p-6 sm:p-8">
        <div>
          <label htmlFor="colour-text" className="block text-sm font-semibold text-slate-800">
            Type a colour
          </label>
          <input
            id="colour-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!parsed.ok && text.trim() !== "" ? true : undefined}
            aria-describedby="colour-hint colour-error"
            className={`${field} font-mono`}
          />
          <p id="colour-hint" className="mt-1 text-xs text-slate-600">
            A hex code (#1a73e8), rgb(26, 115, 232) or hsl(214, 82%, 51%).
          </p>
          <p id="colour-error" className="mt-1 min-h-5 text-sm text-red-800">
            {!parsed.ok && text.trim() !== "" ? parsed.error : ""}
          </p>
        </div>
        <div>
          <label htmlFor="colour-picker" className="block text-sm font-semibold text-slate-800">
            Or pick a colour
          </label>
          <input id="colour-picker" type="color" value={colour ? toHex({ ...colour, a: 1 }) : "#000000"} onChange={(e) => setText(e.target.value)} className="mt-1.5 h-12 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1" />
        </div>
        <p className="text-sm text-muted">Your colour is read in this page and is never sent anywhere.</p>
      </div>

      <div role="status" aria-live="polite" className="panel bg-surface space-y-5 p-6 sm:p-8">
        {colour && outputs ? (
          <>
            <div className="h-24 rounded-xl ring-1 ring-line" style={{ backgroundColor: `rgba(${colour.r}, ${colour.g}, ${colour.b}, ${colour.a})` }} aria-hidden="true" />
            <dl className="space-y-3">
              {outputs.map(([name, value]) => (
                <div key={name} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 first:border-0 first:pt-0">
                  <dt className="text-sm text-muted">{name}</dt>
                  <dd className="flex items-center gap-2">
                    <code className="font-mono text-sm text-ink">{value}</code>
                    <CopyButton text={value} label={`Copy ${name}`} insideStatus />
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <h2 className="t-eyebrow">As text colour (WCAG contrast)</h2>
              <table className="mt-2 w-full text-left text-sm">
                <caption className="sr-only">Contrast of this colour as text on white and on black</caption>
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="py-1 pr-2 font-medium">On</th>
                    <th scope="col" className="py-1 pr-2 font-medium">Ratio</th>
                    <th scope="col" className="py-1 pr-2 font-medium">AA text</th>
                    <th scope="col" className="py-1 pr-2 font-medium">AA large</th>
                    <th scope="col" className="py-1 font-medium">AAA text</th>
                  </tr>
                </thead>
                <tbody>
                  {contrastAgainstWhiteAndBlack(colour).map((c) => (
                    <tr key={c.against} className="border-t border-line">
                      <th scope="row" className="py-1.5 pr-2 font-medium capitalize text-ink">{c.against}</th>
                      <td className="py-1.5 pr-2">{c.ratio.toFixed(2)}:1</td>
                      <td className="py-1.5 pr-2">{pass(c.aa)}</td>
                      <td className="py-1.5 pr-2">{pass(c.aaLarge)}</td>
                      <td className="py-1.5">{pass(c.aaa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {colour.a < 1 && <p className="mt-2 text-xs text-muted">The colour is partly transparent; contrast is shown as if it were solid.</p>}
            </div>
          </>
        ) : (
          <p className="text-muted">Enter a colour to see it in every format.</p>
        )}
      </div>
    </div>
  );
}
