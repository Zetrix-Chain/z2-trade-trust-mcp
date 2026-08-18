import { z, ZodError } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CoreEngineError, ServiceDisabledError } from "./errors.js";
import type { CoreEngineClient } from "./client/types.js";
import type { Capability } from "./config/capabilities.js";
import { createCoreEngineClient } from "./client/core-engine.js";
import { createElicitingSecretProvider } from "./secret-elicitation.js";
import type { Profile } from "./config/profile.js";
import { registeredToolNames } from "./tools/registry.js";
import { healthCheck } from "./tools/utility.js";
import {
  getFinality,
  verifyCredential,
  verifyEbl,
  getStatusList,
  getEblOwner,
  getEndorsementChain,
  resolveIdentity,
  txHashSchema,
  verifyInputSchema,
  getStatusListInputSchema,
  tokenAndRegistrySchema,
  resolveIdentityInputSchema,
} from "./tools/query.js";
import {
  prepareCredential,
  signCredential,
  completeCredential,
  mutateStatus,
  prepareMintEbl,
  completeMintEbl,
  transferHolder,
  transferBeneficiary,
  transferOwners,
  nominateBeneficiary,
  rejectTransferHolder,
  rejectTransferBeneficiary,
  rejectTransferOwners,
  surrenderEbl,
  acceptSurrender,
  rejectSurrender,
  onboardIssuer,
  onboardIssuerRelay,
  buildRelayTx,
  submitRelayTx,
  bindIdentity,
  prepareCredentialInputSchema,
  signCredentialInputSchema,
  completeCredentialInputSchema,
  mutateStatusInputSchema,
  prepareMintEblInputSchema,
  completeMintEblInputSchema,
  transferHolderInputSchema,
  beneficiaryInputSchema,
  transferOwnersInputSchema,
  fromAndRegistryInputSchema,
  onboardIssuerInputSchema,
  buildRelayTxInputSchema,
  submitRelayTxInputSchema,
  bindIdentityInputSchema,
} from "./tools/write.js";
import { issueDocument, mintEbl, issueDocumentInputSchema, mintEblInputSchema } from "./tools/workflows.js";
import { createIssuerKey, createIssuerKeyInputSchema } from "./tools/keys.js";
import { signRelayRequest, signRelayRequestInputSchema } from "./tools/relay-signing.js";

export function formatError(err: unknown): { type: string; message: string; capability?: string } {
  if (err instanceof ServiceDisabledError) {
    return { type: err.name, message: err.message, capability: err.capability };
  }
  if (err instanceof CoreEngineError) {
    return { type: err.name, message: err.message };
  }
  if (err instanceof ZodError) {
    return { type: "ValidationError", message: err.message };
  }
  return { type: "Error", message: err instanceof Error ? err.message : String(err) };
}

export interface ToolDescriptor {
  description: string;
  schema: z.ZodType;
  handler: (args: unknown) => Promise<unknown>;
}

const EMPTY_SCHEMA = z.object({});

export function buildToolDescriptors(
  client: CoreEngineClient,
  capabilities: Partial<Record<Capability, boolean>> | undefined,
  allowWrites: boolean
): Record<string, ToolDescriptor> {
  const all: Record<string, ToolDescriptor> = {
    health_check: {
      description: "Liveness probe. No auth needed even by core-engine.",
      schema: EMPTY_SCHEMA,
      handler: () => healthCheck(client),
    },
    verify_credential: {
      description: "Full verification of a verifiable-document credential.",
      schema: verifyInputSchema,
      handler: (args) => verifyCredential(client, args as never, capabilities),
    },
    verify_ebl: {
      description: "Same as verify_credential, plus on-chain minted/active status and current owner.",
      schema: verifyInputSchema,
      handler: (args) => verifyEbl(client, args as never, capabilities),
    },
    get_status_list: {
      description: "Fetch a signed status-list VC for a purpose (revocation/suspension).",
      schema: getStatusListInputSchema,
      handler: (args) => getStatusList(client, args as never, capabilities),
    },
    get_ebl_owner: {
      description: "Current on-chain owner (beneficiary/holder pair) of a token.",
      schema: tokenAndRegistrySchema,
      handler: (args) => getEblOwner(client, args as never, capabilities),
    },
    get_endorsement_chain: {
      description: "Full ownership-change history for a token.",
      schema: tokenAndRegistrySchema,
      handler: (args) => getEndorsementChain(client, args as never, capabilities),
    },
    resolve_identity: {
      description: "Resolve a bound did:zid for a wallet address.",
      schema: resolveIdentityInputSchema,
      handler: (args) => resolveIdentity(client, args as never, capabilities),
    },
    get_finality: {
      description: "Finality status of a transaction.",
      schema: txHashSchema,
      handler: (args) => getFinality(client, args as never, capabilities),
    },
    prepare_credential: {
      description: "Builds an unsigned VC + the signing spec the caller's signer needs.",
      schema: prepareCredentialInputSchema,
      handler: (args) => prepareCredential(client, args as never, capabilities),
    },
    sign_credential: {
      description: "core-engine signs on the issuer's behalf, given the raw key. Opt-in, off by default.",
      schema: signCredentialInputSchema,
      handler: (args) => signCredential(client, args as never, capabilities),
    },
    complete_credential: {
      description: "Verifies the signed VC and finalizes it against the earlier prepare call.",
      schema: completeCredentialInputSchema,
      handler: (args) => completeCredential(client, args as never, capabilities),
    },
    issue_document: {
      description: "Intent-driven front door for Pillar 1: prepare -> sign? -> complete.",
      schema: issueDocumentInputSchema,
      handler: (args) => issueDocument(client, args as never, capabilities),
    },
    create_issuer_key: {
      description:
        "Generates a fresh signing key locally -- no core-engine call, never persisted BY THIS SERVER. " +
        "The returned secretKeyMultibase / privateKey is still the tool's result, so it lands in the " +
        "calling MCP host's transcript same as any other output -- store it yourself if you need it again.",
      schema: createIssuerKeyInputSchema,
      handler: (args) => createIssuerKey(args as never, capabilities),
    },
    mutate_status: {
      description: "Revoke or suspend (unrevoke) a credential's status-list entry.",
      schema: mutateStatusInputSchema,
      handler: (args) => mutateStatus(client, args as never, capabilities),
    },
    prepare_mint_ebl: {
      description: "Builds the unsigned mint VC for a transferable record.",
      schema: prepareMintEblInputSchema,
      handler: (args) => prepareMintEbl(client, args as never, capabilities),
    },
    complete_mint_ebl: {
      description: "Finalizes the mint: verifies the signed VC and returns the unsigned mint tx.",
      schema: completeMintEblInputSchema,
      handler: (args) => completeMintEbl(client, args as never, capabilities),
    },
    mint_ebl: {
      description: "Intent-driven front door for Pillar 2: prepare-mint -> sign? -> complete-mint.",
      schema: mintEblInputSchema,
      handler: (args) => mintEbl(client, args as never, capabilities),
    },
    transfer_holder: {
      description: "Transfers the holder of an eBL.",
      schema: transferHolderInputSchema,
      handler: (args) => transferHolder(client, args as never, capabilities),
    },
    transfer_beneficiary: {
      description: "Transfers the beneficiary of an eBL.",
      schema: beneficiaryInputSchema,
      handler: (args) => transferBeneficiary(client, args as never, capabilities),
    },
    transfer_owners: {
      description: "Combined beneficiary + holder transfer in one call.",
      schema: transferOwnersInputSchema,
      handler: (args) => transferOwners(client, args as never, capabilities),
    },
    nominate_beneficiary: {
      description: "Nominates a new beneficiary for an eBL.",
      schema: beneficiaryInputSchema,
      handler: (args) => nominateBeneficiary(client, args as never, capabilities),
    },
    reject_transfer_holder: {
      description: "Rejects a pending holder transfer.",
      schema: fromAndRegistryInputSchema,
      handler: (args) => rejectTransferHolder(client, args as never, capabilities),
    },
    reject_transfer_beneficiary: {
      description: "Rejects a pending beneficiary transfer.",
      schema: fromAndRegistryInputSchema,
      handler: (args) => rejectTransferBeneficiary(client, args as never, capabilities),
    },
    reject_transfer_owners: {
      description: "Rejects a pending combined owners transfer.",
      schema: fromAndRegistryInputSchema,
      handler: (args) => rejectTransferOwners(client, args as never, capabilities),
    },
    surrender_ebl: {
      description: "Surrenders an eBL back to the issuer.",
      schema: fromAndRegistryInputSchema,
      handler: (args) => surrenderEbl(client, args as never, capabilities),
    },
    accept_surrender: {
      description: "Accepts a surrendered eBL -- end of life.",
      schema: fromAndRegistryInputSchema,
      handler: (args) => acceptSurrender(client, args as never, capabilities),
    },
    reject_surrender: {
      description: "Rejects a surrender -- eBL goes back to active.",
      schema: fromAndRegistryInputSchema,
      handler: (args) => rejectSurrender(client, args as never, capabilities),
    },
    onboard_issuer: {
      description: "Deploys a brand-new token registry for a new issuer.",
      schema: onboardIssuerInputSchema,
      handler: (args) => onboardIssuer(client, args as never, capabilities),
    },
    onboard_issuer_relay: {
      description: "Same as onboard_issuer, but gasless -- core-engine's relayer pays gas.",
      schema: onboardIssuerInputSchema,
      handler: (args) => onboardIssuerRelay(client, args as never, capabilities),
    },
    build_relay_tx: {
      description: "Wraps an already-built unsigned tx as a signable EIP-712 ForwardRequest.",
      schema: buildRelayTxInputSchema,
      handler: (args) => buildRelayTx(client, args as never, capabilities),
    },
    submit_relay_tx: {
      description: "Submits a signed ForwardRequest -- core-engine's relayer wallet relays it.",
      schema: submitRelayTxInputSchema,
      handler: (args) => submitRelayTx(client, args as never, capabilities),
    },
    sign_relay_request: {
      description: "Signs the EIP-712 ForwardRequest build_relay_tx returns, purely locally.",
      schema: signRelayRequestInputSchema,
      handler: (args) => signRelayRequest(args as never),
    },
    bind_identity: {
      description: "Binds a did:zid to a wallet address via a dual signature.",
      schema: bindIdentityInputSchema,
      handler: (args) => bindIdentity(client, args as never, capabilities),
    },
  };

  const names = registeredToolNames({ Z2TT_ALLOW_WRITES: allowWrites ? "true" : undefined });
  return Object.fromEntries(names.map((name) => [name, all[name]]));
}

export function buildServer(profile: Profile, allowWrites: boolean): McpServer {
  const server = new McpServer({ name: "z2-trade-trust-mcp", version: "0.1.0" });
  const getSecret =
    profile.hmacSecret === undefined ? createElicitingSecretProvider(server.server, profile.callerId) : undefined;
  const client = createCoreEngineClient(profile, { getSecret });
  const descriptors = buildToolDescriptors(client, profile.capabilities, allowWrites);

  for (const [name, { description, schema, handler }] of Object.entries(descriptors)) {
    server.registerTool(name, { description, inputSchema: schema }, async (args: unknown) => {
      try {
        const result = await handler(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: formatError(err) }) }] };
      }
    });
  }

  return server;
}
