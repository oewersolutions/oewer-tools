import type { Page } from "@playwright/test";

/** A 200x100 gradient PNG made in the browser, so the tests need no fixture file. */
export async function samplePng(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 200, 100);
    gradient.addColorStop(0, "#174f49");
    gradient.addColorStop(1, "#f4a261");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 100);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  });
  return Buffer.from(base64, "base64");
}

export const upload = async (page: Page, name = "sample.png") =>
  page.getByLabel(/choose an image/i).setInputFiles({ name, mimeType: "image/png", buffer: await samplePng(page) });
