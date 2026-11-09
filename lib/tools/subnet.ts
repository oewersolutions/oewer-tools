/** Maths for the IPv4 subnet calculator. Addresses are handled as unsigned 32-bit numbers. Pure functions, no DOM. */
import type { Workings } from "./workings";

export interface SubnetRaw extends Record<string, string> {
  address: string;
  prefix: string;
}

export interface SubnetResult {
  cidr: string;
  network: string;
  broadcast: string;
  mask: string;
  wildcard: string;
  firstHost: string;
  lastHost: string;
  total: number;
  usable: number;
  addressClass: string;
  privateRange: string;
  workings: Workings;
}

export function parseIpv4(text: string): number | undefined {
  const parts = text.trim().split(".");
  if (parts.length !== 4) return undefined;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return undefined;
    const v = Number(p);
    if (v > 255) return undefined;
    n = n * 256 + v;
  }
  return n;
}

export const formatIpv4 = (n: number): string =>
  [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
export const binary = (n: number): string =>
  [24, 16, 8, 0]
    .map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0"))
    .join(".");
export const maskFor = (prefix: number): number =>
  prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;

/** Reads "24", "/24" or a dotted mask such as 255.255.255.0 and returns the prefix length. */
export function parsePrefix(text: string): { prefix?: number; error?: string } {
  const s = text.trim().replace(/^\//, "");
  if (s === "") return {};
  if (s.includes(".")) {
    const mask = parseIpv4(s);
    if (mask === undefined)
      return { error: "That is not a valid subnet mask." };
    const inverted = ~mask >>> 0;
    if ((inverted & (inverted + 1)) !== 0)
      return {
        error:
          "A subnet mask must be a run of 1s followed by 0s, such as 255.255.255.0.",
      };
    return { prefix: Math.clz32(inverted) };
  }
  if (!/^\d{1,2}$/.test(s) || Number(s) > 32)
    return { error: "The prefix length must be a whole number from 0 to 32." };
  return { prefix: Number(s) };
}

function classOf(n: number): string {
  const first = n >>> 24;
  if (first < 128) return "A";
  if (first < 192) return "B";
  if (first < 224) return "C";
  if (first < 240) return "D (multicast)";
  return "E (reserved)";
}

function privateOf(n: number): string {
  const a = n >>> 24;
  const b = (n >>> 16) & 255;
  if (a === 10) return "Private (10.0.0.0/8)";
  if (a === 172 && b >= 16 && b <= 31) return "Private (172.16.0.0/12)";
  if (a === 192 && b === 168) return "Private (192.168.0.0/16)";
  if (a === 127) return "Loopback (127.0.0.0/8)";
  if (a === 169 && b === 254) return "Link-local (169.254.0.0/16)";
  return "Public";
}

export function evaluateSubnet(raw: SubnetRaw): {
  errors: Partial<Record<string, string>>;
  result?: SubnetResult;
} {
  const errors: Partial<Record<string, string>> = {};
  let address: number | undefined;
  if (raw.address.trim() !== "") {
    address = parseIpv4(raw.address);
    if (address === undefined)
      errors.address =
        "Enter an IPv4 address as four numbers from 0 to 255, such as 192.168.1.10.";
  }
  const p = parsePrefix(raw.prefix);
  if (p.error) errors.prefix = p.error;
  if (
    address === undefined ||
    p.prefix === undefined ||
    Object.keys(errors).length > 0
  )
    return { errors };

  const prefix = p.prefix;
  const mask = maskFor(prefix);
  const wildcard = ~mask >>> 0;
  const network = (address & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = 2 ** (32 - prefix);
  const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : total - 2;
  const firstHost = prefix >= 31 ? network : network + 1;
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1;
  return {
    errors,
    result: {
      cidr: `${formatIpv4(network)}/${prefix}`,
      network: formatIpv4(network),
      broadcast: formatIpv4(broadcast),
      mask: formatIpv4(mask),
      wildcard: formatIpv4(wildcard),
      firstHost: formatIpv4(firstHost),
      lastHost: formatIpv4(lastHost),
      total,
      usable,
      addressClass: classOf(address),
      privateRange: privateOf(address),
      workings: {
        formula: [
          "network = address AND mask",
          "broadcast = network OR wildcard (wildcard is the mask with its bits flipped)",
          "addresses = 2^(32 − prefix); usable hosts = addresses − 2",
        ],
        steps: [
          `A prefix of /${prefix} means the first ${prefix} bits are the network part, so the mask is ${formatIpv4(mask)}.`,
          `Address  ${binary(address)}  (${formatIpv4(address)})`,
          `Mask     ${binary(mask)}  (${formatIpv4(mask)})`,
          `AND gives the network  ${binary(network)}  (${formatIpv4(network)}).`,
          `Flip the mask for the wildcard ${formatIpv4(wildcard)}, and OR it with the network to get the broadcast address ${formatIpv4(broadcast)}.`,
          `Addresses in the block = 2^${32 - prefix} = ${total.toLocaleString("en-IN")}; usable hosts = ${usable.toLocaleString("en-IN")}${prefix >= 31 ? (prefix === 32 ? " (a single host address)" : " (a /31 has no network or broadcast address on point-to-point links)") : ` (${total.toLocaleString("en-IN")} − 2, since the network and broadcast addresses are not given to hosts)`}.`,
          `First host ${formatIpv4(firstHost)}, last host ${formatIpv4(lastHost)}.`,
        ],
        note: "IPv4 only. Class names are the old classful labels and are shown for reference; today networks are described by their prefix length.",
      },
    },
  };
}
