/** Reading the parts of a JSON Web Token. This only decodes; it does not (and cannot, without the key) check the signature. */

import { base64Decode } from "./encoding";

export interface TimeClaim {
  claim: "exp" | "nbf" | "iat";
  label: string;
  /** Seconds since 1970, as written in the token. */
  seconds: number;
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  algorithm?: string;
  times: TimeClaim[];
  warnings: string[];
}

export type JwtResult = { ok: true; token: DecodedJwt } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function part(text: string, which: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const decoded = base64Decode(text);
  if (!decoded.ok) return { ok: false, error: `The ${which} is not valid Base64URL text.` };
  try {
    const json: unknown = JSON.parse(decoded.value);
    return isObject(json) ? { ok: true, value: json } : { ok: false, error: `The ${which} is JSON, but not an object.` };
  } catch {
    return { ok: false, error: `The ${which} decodes, but it is not valid JSON.` };
  }
}

const TIME_LABELS: Record<TimeClaim["claim"], string> = { exp: "Expires", nbf: "Not valid before", iat: "Issued" };

export function decodeJwt(input: string): JwtResult {
  const text = input.trim().replace(/^bearer\s+/i, "").replace(/\s+/g, "");
  if (text === "") return { ok: false, error: "Paste a token to decode it." };
  const pieces = text.split(".");
  if (pieces.length === 5) return { ok: false, error: "This looks like an encrypted token (JWE, five parts). Its contents cannot be read without the key." };
  if (pieces.length !== 3) return { ok: false, error: "A token has three parts separated by dots: header.payload.signature." };
  const header = part(pieces[0]!, "header");
  if (!header.ok) return header;
  const payload = part(pieces[1]!, "payload");
  if (!payload.ok) return payload;

  const warnings: string[] = [];
  const algorithm = typeof header.value.alg === "string" ? header.value.alg : undefined;
  if (algorithm?.toLowerCase() === "none") warnings.push('The algorithm is "none": this token is not signed, so anyone could have written it.');
  else if (pieces[2] === "") warnings.push("The signature is empty.");

  const times: TimeClaim[] = [];
  for (const claim of ["iat", "nbf", "exp"] as const) {
    const v = payload.value[claim];
    if (v === undefined) continue;
    if (typeof v === "number" && Number.isFinite(v) && Math.abs(v) * 1000 <= 8.64e15) times.push({ claim, label: TIME_LABELS[claim], seconds: v });
    else warnings.push(`The "${claim}" claim should be a number of seconds, but it is not.`);
  }
  return { ok: true, token: { header: header.value, payload: payload.value, signature: pieces[2]!, algorithm, times, warnings } };
}

export type Validity = "expired" | "not-yet" | "in-time" | "no-expiry";

/** Whether the time claims put the token inside its window at `nowSeconds`. This says nothing about the signature. */
export function validityAt(token: DecodedJwt, nowSeconds: number): Validity {
  const exp = token.times.find((t) => t.claim === "exp");
  const nbf = token.times.find((t) => t.claim === "nbf");
  if (exp && nowSeconds >= exp.seconds) return "expired";
  if (nbf && nowSeconds < nbf.seconds) return "not-yet";
  return exp ? "in-time" : "no-expiry";
}

export const prettyJson = (value: unknown): string => JSON.stringify(value, null, 2);
