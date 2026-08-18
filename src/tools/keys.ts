import { z } from "zod";
import { Wallet } from "ethers";
import { ServiceDisabledError } from "../errors.js";
import type { Capability } from "../config/capabilities.js";
import { generateP256Multikey } from "../crypto/multikey.js";

export type ToolCapabilities = Partial<Record<Capability, boolean>>;

export const createIssuerKeyInputSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("vc"),
      issuerDid: z.string().min(1).optional(),
      keyId: z.string().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("evm"),
      issuerDid: z.string().min(1).optional(),
    })
    .strict(),
]);
export type CreateIssuerKeyInput = z.infer<typeof createIssuerKeyInputSchema>;

export interface VcIssuerKeyResult {
  "@context": string;
  id: string;
  type: "Multikey";
  controller: string;
  publicKeyMultibase: string;
  secretKeyMultibase: string;
}

export interface EvmIssuerKeyResult {
  address: string;
  privateKey: string;
}

export async function createIssuerKey(
  input: CreateIssuerKeyInput,
  capabilities?: ToolCapabilities
): Promise<VcIssuerKeyResult | EvmIssuerKeyResult> {
  const parsed = createIssuerKeyInputSchema.parse(input);

  if (parsed.kind === "vc") {
    if (capabilities?.allowIssuerSigning === false) {
      throw new ServiceDisabledError(
        "issuer signing is not enabled on this core-engine deployment",
        "allowIssuerSigning"
      );
    }
    const { publicKeyMultibase, secretKeyMultibase } = generateP256Multikey();
    // No issuerDid supplied -- derive a self-resolving did:key from this key's own public key
    // rather than requiring the caller to invent one. did:key needs no hosting/resolution and is
    // always trusted by core-engine's document loader (unlike an arbitrary did:web), so this is
    // also the identity that will actually pass signature verification later, not just a
    // placeholder. Fragment convention matches did:key's own (repeats the multibase key), not the
    // "#key-1" convention used for a caller-supplied issuerDid.
    const controller = parsed.issuerDid ?? `did:key:${publicKeyMultibase}`;
    const defaultFragment = parsed.issuerDid ? "key-1" : publicKeyMultibase;
    return {
      "@context": "https://w3id.org/security/multikey/v1",
      id: parsed.keyId ?? `${controller}#${defaultFragment}`,
      type: "Multikey",
      controller,
      publicKeyMultibase,
      secretKeyMultibase,
    };
  }

  if (capabilities?.ebl === false) {
    throw new ServiceDisabledError("ebl endpoints are not enabled on this core-engine deployment", "ebl");
  }
  const wallet = Wallet.createRandom();
  return { address: wallet.address, privateKey: wallet.privateKey };
}
