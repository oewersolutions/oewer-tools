/**
 * Merging, splitting and building PDFs with pdf-lib. Browser and Node. The library is loaded only when one of these is first
 * used, so pages that do not need it do not download it. Nothing leaves the device.
 */

import { placeImage, type PageSize } from "./pdf";

type PdfLib = typeof import("pdf-lib");
let library: Promise<PdfLib> | undefined;
const pdfLib = (): Promise<PdfLib> => (library ??= import("pdf-lib"));

export class PdfProblem extends Error {}

async function open(lib: PdfLib, bytes: Uint8Array, name: string) {
  try {
    return await lib.PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    if (e instanceof lib.EncryptedPDFError) throw new PdfProblem(`"${name}" is protected with a password. Remove the password first, then try again.`);
    throw new PdfProblem(`"${name}" could not be read as a PDF. It may be damaged.`);
  }
}

export async function countPages(bytes: Uint8Array, name = "This file"): Promise<number> {
  const lib = await pdfLib();
  return (await open(lib, bytes, name)).getPageCount();
}

export async function mergePdfs(files: { name: string; bytes: Uint8Array }[]): Promise<{ bytes: Uint8Array; pages: number }> {
  const lib = await pdfLib();
  const out = await lib.PDFDocument.create();
  for (const f of files) {
    const doc = await open(lib, f.bytes, f.name);
    const copied = await out.copyPages(doc, doc.getPageIndices());
    copied.forEach((p) => out.addPage(p));
  }
  return { bytes: await out.save(), pages: out.getPageCount() };
}

/** A new PDF with the chosen pages (indexes from 0) in the order given. */
export async function extractPages(bytes: Uint8Array, pages: number[], name = "This file"): Promise<Uint8Array> {
  const lib = await pdfLib();
  const doc = await open(lib, bytes, name);
  const out = await lib.PDFDocument.create();
  const copied = await out.copyPages(doc, pages);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

export interface PdfImage {
  /** Raw JPG or PNG bytes. */
  bytes: Uint8Array;
  kind: "jpg" | "png";
}

export async function imagesToPdf(images: PdfImage[], size: PageSize, marginPoints: number): Promise<Uint8Array> {
  const lib = await pdfLib();
  const out = await lib.PDFDocument.create();
  for (const img of images) {
    const embedded = img.kind === "jpg" ? await out.embedJpg(img.bytes) : await out.embedPng(img.bytes);
    const at = placeImage(embedded.width, embedded.height, size, size === "fit" ? 0 : marginPoints);
    const page = out.addPage([at.pageWidth, at.pageHeight]);
    page.drawImage(embedded, { x: at.x, y: at.y, width: at.width, height: at.height });
  }
  return out.save();
}
