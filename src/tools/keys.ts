import { z } from "zod";
import { Wallet } from "ethers";
import { ServiceDisabledError } from "../errors.js";
import type { Capability } from "../config/capabilities.js";
import { generateP256Multikey } from "../crypto/multikey.js";

export type ToolCapabilities = Partial<Record<Capability, boolean>>;

// A flat z.object() rather than z.discriminatedUnion("kind", [...]) -- the MCP SDK's
// registerTool() only recognizes plain ZodObject schemas (it looks for `.shape`, which neither a
// discriminated union nor a ZodEffects from .superRefine()/.refine() exposes) when advertising a
// tool's inputSchema to clients. A discriminated union still validates correctly at call time, but
// the client never sees `kind` (or any field) in the advertised schema, so callers can't tell the
// tool needs a `kind` argument at all. The "keyId not applicable to evm" cross-field check the
// union used to give for free (via its separate `.strict()` object shapes) is done by hand in
// createIssuerKey() below instead of via .superRefine(), to keep this a plain ZodObject.
export const createIssuerKeyInputSchema = z
  .object({
    kind: z.enum(["vc", "evm"]),
    issuerDid: z.string().min(1).optional(),
    keyId: z.string().optional(),
  })
  .strict();
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
  if (parsed.kind === "evm" && parsed.keyId !== undefined) {
    throw new z.ZodError([
      { code: z.ZodIssueCode.custom, path: ["keyId"], message: 'keyId is not applicable to kind "evm"' },
    ]);
  }

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
