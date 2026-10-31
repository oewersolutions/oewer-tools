import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";

/** Files made on the fly for the file tools. */
export async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200 + i, 300]);
  return Buffer.from(await doc.save());
}

export const pdfFile = async (name: string, pages: number) => ({ name, mimeType: "application/pdf", buffer: await makePdf(pages) });

export const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const enc = (s: string) => Buffer.from(s, "latin1");
const segment = (marker: number, body: Buffer) => Buffer.concat([Buffer.from([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 255]), body]);

/** Not a picture you could look at, but a JPG laid out the way a phone's photo is: with Exif (camera name and a GPS marker), XMP and a comment. */
export function jpegWithHiddenData(): Buffer {
  const strings = Buffer.concat([enc("Acme\0"), enc("Phone 9\0")]);
  const dataStart = 8 + 2 + 3 * 12 + 4;
  const ifd = Buffer.alloc(2 + 3 * 12 + 4);
  ifd.writeUInt16LE(3, 0);
  const put = (i: number, tag: number, type: number, count: number, value: number) => {
    const o = 2 + i * 12;
    ifd.writeUInt16LE(tag, o);
    ifd.writeUInt16LE(type, o + 2);
    ifd.writeUInt32LE(count, o + 4);
    if (type === 3) ifd.writeUInt16LE(value, o + 8);
    else ifd.writeUInt32LE(value, o + 8);
  };
  put(0, 0x010f, 2, 5, dataStart);
  put(1, 0x0110, 2, 8, dataStart + 5);
  put(2, 0x8825, 4, 1, 0);
  const exif = Buffer.concat([enc("Exif\0\0"), Buffer.from([0x49, 0x49, 42, 0, 8, 0, 0, 0]), ifd, strings]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, enc("JFIF\0\x01\x01\0\0\x01\0\x01\0\0")),
    segment(0xe1, exif),
    segment(0xe1, enc("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>")),
    segment(0xfe, enc("secret comment")),
    Buffer.from([0xff, 0xda, 0, 4, 1, 2, 9, 9, 9, 0xff, 0xd9]),
  ]);
}

export const readDownload = (path: string) => readFileSync(path);
