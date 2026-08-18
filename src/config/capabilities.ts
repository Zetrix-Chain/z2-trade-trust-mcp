import { NotFoundError, ServiceDisabledError } from "../errors.js";

/** core-engine ServerOptions flags a deployment may opt into. */
export type Capability = "prepare" | "allowIssuerSigning" | "status" | "ebl" | "identity" | "finality";

// Order matters: exceptions (always-open routes) and specific /credentials/* routes are checked
// before the general prefix rules, since /credentials/verify and /ebl/verify are exceptions
// within prefixes ("/credentials/", "/ebl/") that otherwise require a capability.
const EXACT_ROUTES: ReadonlyArray<readonly [string, Capability | undefined]> = [
  ["/health", undefined],
  ["/credentials/verify", undefined],
  ["/ebl/verify", undefined],
  ["/credentials/prepare", "prepare"],
  ["/credentials/complete", "prepare"],
  ["/credentials/sign", "allowIssuerSigning"],
];

const PREFIX_ROUTES: ReadonlyArray<readonly [string, Capability]> = [
  ["/status/", "status"],
  ["/ebl/", "ebl"],
  ["/identity/", "identity"],
  ["/finality/", "finality"],
];

/** The capability a route belongs to, or undefined for an always-open route. */
export function capabilityForPath(path: string): Capability | undefined {
  for (const [route, capability] of EXACT_ROUTES) {
    if (path === route) return capability;
  }
  for (const [prefix, capability] of PREFIX_ROUTES) {
    if (path.startsWith(prefix)) return capability;
  }
  return undefined;
}

/**
 * Fail fast, before any network call, when the profile explicitly marks a route's capability as
 * disabled. Does nothing for an always-open route, an unset capabilities map, or a capability the
 * map didn't mention -- an omitted/absent capabilities map registers the full tool set
 * optimistically rather than failing at startup.
 */
export function assertCapabilityEnabled(path: string, capabilities: Partial<Record<Capability, boolean>> | undefined): void {
  const capability = capabilityForPath(path);
  if (!capability || !capabilities) return;
  if (capabilities[capability] === false) {
    throw new ServiceDisabledError(`${capability} endpoints are not enabled on this core-engine deployment`, capability);
  }
}

/** Reclassify a 404 response as ServiceDisabledError when the route belongs to a known capability. */
export function classifyNotFound(path: string, message: string): NotFoundError {
  const capability = capabilityForPath(path);
  return capability ? new ServiceDisabledError(message, capability) : new NotFoundError(message);
}
