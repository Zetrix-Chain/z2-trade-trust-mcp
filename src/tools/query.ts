import { z } from "zod";
import type { CoreEngineClient } from "../client/types.js";
import { assertCapabilityEnabled, type Capability } from "../config/capabilities.js";

export type ToolCapabilities = Partial<Record<Capability, boolean>>;

export const resolveIdentityInputSchema = z.object({ address: z.string() });
export type ResolveIdentityInput = z.infer<typeof resolveIdentityInputSchema>;

export interface ResolveIdentityResult {
  address: string;
  did: string | null;
}

export const txHashSchema = z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "txHash must be 0x + 32 bytes hex") });
export type GetFinalityInput = z.infer<typeof txHashSchema>;

export interface FinalityResult {
  txHash: string;
  status: string;
}

export async function getFinality(
  client: CoreEngineClient,
  input: GetFinalityInput,
  capabilities?: ToolCapabilities
): Promise<FinalityResult> {
  const { txHash } = txHashSchema.parse(input);
  const path = `/finality/${encodeURIComponent(txHash)}`;
  assertCapabilityEnabled(path, capabilities);
  return client.get<FinalityResult>(path);
}

export const verifyInputSchema = z.object({
  verifiableCredential: z.record(z.string(), z.unknown()),
  trustedIssuers: z.array(z.string()).optional(),
});
export type VerifyInput = z.infer<typeof verifyInputSchema>;

export interface VerifyResult {
  valid: boolean;
  trusted: boolean;
  [key: string]: unknown;
}

export async function verifyCredential(
  client: CoreEngineClient,
  input: VerifyInput,
  capabilities?: ToolCapabilities
): Promise<VerifyResult> {
  const { verifiableCredential, trustedIssuers } = verifyInputSchema.parse(input);
  const path = "/credentials/verify";
  assertCapabilityEnabled(path, capabilities);
  return client.post<VerifyResult>(path, { verifiableCredential, trustedIssuers });
}

export async function verifyEbl(
  client: CoreEngineClient,
  input: VerifyInput,
  capabilities?: ToolCapabilities
): Promise<VerifyResult> {
  const { verifiableCredential, trustedIssuers } = verifyInputSchema.parse(input);
  const path = "/ebl/verify";
  assertCapabilityEnabled(path, capabilities);
  return client.post<VerifyResult>(path, { verifiableCredential, trustedIssuers });
}

export const getStatusListInputSchema = z.object({
  issuerId: z.string(),
  purpose: z.enum(["revocation", "suspension"]),
});
export type GetStatusListInput = z.infer<typeof getStatusListInputSchema>;

export async function getStatusList(
  client: CoreEngineClient,
  input: GetStatusListInput,
  capabilities?: ToolCapabilities
): Promise<Record<string, unknown>> {
  const { issuerId, purpose } = getStatusListInputSchema.parse(input);
  const path = `/status/${encodeURIComponent(issuerId)}/${encodeURIComponent(purpose)}`;
  assertCapabilityEnabled(path, capabilities);
  return client.get<Record<string, unknown>>(path);
}

const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x + 20 bytes EVM address");

export const tokenAndRegistrySchema = z.object({
  tokenId: z.string(),
  tokenRegistry: addressSchema,
});
export type TokenAndRegistryInput = z.infer<typeof tokenAndRegistrySchema>;

/** Matches core-engine's real /ebl/:tokenId/owner -- the ERC-721 ownerOf() result (the Title
 * Escrow contract address), not a beneficiary/holder split. */
export interface EblOwner {
  tokenId: string;
  owner: string;
}

export async function getEblOwner(
  client: CoreEngineClient,
  input: TokenAndRegistryInput,
  capabilities?: ToolCapabilities
): Promise<EblOwner> {
  const { tokenId, tokenRegistry } = tokenAndRegistrySchema.parse(input);
  const path = `/ebl/${encodeURIComponent(tokenId)}/owner`;
  assertCapabilityEnabled(path, capabilities);
  return client.get<EblOwner>(path, { tokenRegistry });
}

export async function getEndorsementChain(
  client: CoreEngineClient,
  input: TokenAndRegistryInput,
  capabilities?: ToolCapabilities
): Promise<Record<string, unknown>> {
  const { tokenId, tokenRegistry } = tokenAndRegistrySchema.parse(input);
  const path = `/ebl/${encodeURIComponent(tokenId)}/endorsement-chain`;
  assertCapabilityEnabled(path, capabilities);
  return client.get<Record<string, unknown>>(path, { tokenRegistry });
}

export async function resolveIdentity(
  client: CoreEngineClient,
  input: ResolveIdentityInput,
  capabilities?: ToolCapabilities
): Promise<ResolveIdentityResult> {
  const { address } = resolveIdentityInputSchema.parse(input);
  const path = `/identity/resolve/${encodeURIComponent(address)}`;
  assertCapabilityEnabled(path, capabilities);
  return client.get<ResolveIdentityResult>(path);
}
