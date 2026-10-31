/** SHA hashes of text, for the hash generator. Uses the browser's own crypto; nothing is sent anywhere. */

export const HASH_ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

/** The hash of the text's UTF-8 bytes as lowercase hex. */
export async function hashText(text: string, algorithm: HashAlgorithm, subtle: SubtleCrypto = globalThis.crypto.subtle): Promise<string> {
  const digest = await subtle.digest(algorithm, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compare a pasted hash with a computed one, ignoring case, spaces and a trailing newline. */
export const sameHash = (a: string, b: string): boolean => a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase();
