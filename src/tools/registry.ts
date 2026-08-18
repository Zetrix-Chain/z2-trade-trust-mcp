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
