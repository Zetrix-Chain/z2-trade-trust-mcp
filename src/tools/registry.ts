import { isWritesAllowed } from "../config/settings.js";

/** Query + utility tools -- no key needed, always registered. */
export const READ_TOOL_NAMES = [
  "health_check",
  "verify_credential",
  "verify_ebl",
  "get_status_list",
  "get_ebl_owner",
  "get_endorsement_chain",
  "resolve_identity",
  "get_finality",
  "list_document_types",
] as const;

/** Primitive-write + workflow tools -- state-changing, gated behind Z2TT_ALLOW_WRITES. */
export const WRITE_TOOL_NAMES = [
  "prepare_credential",
  "sign_credential",
  "complete_credential",
  "issue_document",
  "create_issuer_key",
  "mutate_status",
  "prepare_mint_ebl",
  "complete_mint_ebl",
  "mint_ebl",
  "transfer_holder",
  "transfer_beneficiary",
  "transfer_owners",
  "nominate_beneficiary",
  "reject_transfer_holder",
  "reject_transfer_beneficiary",
  "reject_transfer_owners",
  "surrender_ebl",
  "accept_surrender",
  "reject_surrender",
  "onboard_issuer",
  "onboard_issuer_relay",
  "build_relay_tx",
  "submit_relay_tx",
  "sign_relay_request",
  "bind_identity",
] as const;

/** The tool names an MCP client would see registered for this env -- write/workflow tools absent unless Z2TT_ALLOW_WRITES=true. */
export function registeredToolNames(env: Record<string, string | undefined>): string[] {
  return isWritesAllowed(env) ? [...READ_TOOL_NAMES, ...WRITE_TOOL_NAMES] : [...READ_TOOL_NAMES];
}

/** Tools that stay registered even with no usable callerId/hmacSecret configured. Two different
 * reasons land a tool here:
 *  - health_check, verify_credential, verify_ebl: the three routes core-engine itself treats as
 *    genuinely unauthenticated server-side, and this repo's capabilities.ts EXACT_ROUTES separately
 *    marks these same three as always-open. Every other core-engine-backed route 401s regardless of
 *    Z2TT_ALLOW_WRITES, so there's no reason to ever register those without usable credentials.
 *  - list_document_types: makes no core-engine call at all -- it's a pure local lookup against the
 *    static catalog in document-types.ts -- so credentials are simply irrelevant to it. It's
 *    included here because there's nothing to gate, not because it's HMAC-exempt server-side. */
export const OPEN_TOOL_NAMES = ["health_check", "verify_credential", "verify_ebl", "list_document_types"] as const;

/** Narrows an already-computed tool name list down to the credential-free subset when no usable
 * callerId/hmacSecret is configured. Returns the list unchanged when hasCredentials is true. */
export function filterForCredentials(names: readonly string[], hasCredentials: boolean): string[] {
  if (hasCredentials) return [...names];
  const open: readonly string[] = OPEN_TOOL_NAMES;
  return names.filter((name) => open.includes(name));
}
