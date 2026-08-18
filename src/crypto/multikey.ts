import { generateKeyPairSync } from "node:crypto";
import { base58btcEncode } from "./multibase.js";

// Multicodec varint prefixes for P-256 -- see https://github.com/multiformats/multicodec
// p256-pub (0x1200) -> [0x80, 0x24]; p256-priv (0x1306) -> [0x86, 0x26].
const P256_PUB_MULTICODEC = new Uint8Array([0x80, 0x24]);
const P256_PRIV_MULTICODEC = new Uint8Array([0x86, 0x26]);

interface JwkEcKey {
  crv: string;
  x: string;
  y?: string;
  d?: string;
}

function multibaseEncode(prefix: Uint8Array, raw: Uint8Array): string {
  return "z" + base58btcEncode(new Uint8Array([...prefix, ...raw]));
}

export interface P256KeyPair {
  publicKeyMultibase: string;
  secretKeyMultibase: string;
}

/** Generates a fresh P-256 keypair, Multikey-encoded (multicodec + multibase base58-btc). */
export function generateP256Multikey(): P256KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });

  const pubJwk = publicKey.export({ format: "jwk" }) as JwkEcKey;
  const privJwk = privateKey.export({ format: "jwk" }) as JwkEcKey;

  const x = new Uint8Array(Buffer.from(pubJwk.x, "base64url"));
  const y = new Uint8Array(Buffer.from(pubJwk.y!, "base64url"));
  const d = new Uint8Array(Buffer.from(privJwk.d!, "base64url"));

  const compressedPrefix = (y[y.length - 1] & 1) === 0 ? 0x02 : 0x03;
  const compressedPublic = new Uint8Array([compressedPrefix, ...x]);

  return {
    publicKeyMultibase: multibaseEncode(P256_PUB_MULTICODEC, compressedPublic),
    secretKeyMultibase: multibaseEncode(P256_PRIV_MULTICODEC, d),
  };
}
