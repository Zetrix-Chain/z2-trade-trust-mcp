import type { Capability } from "./capabilities.js";

export const CORE_ENGINE_BASE_URLS = {
  "z2-testnet": "https://api-tradetrust-sandbox.zetrix.com/api/z2-core-engine",
  "z2-mainnet": "https://api-tradetrust.zetrix.com/api/z2-core-engine",
} as const;

export interface Profile {
  baseUrl: string;
  /** true when baseUrl came from the z2-testnet default (no Z2TT_BASE_URL/Z2TT_ENV set) rather
   * than an explicit choice -- buildServer logs this so an operator who meant mainnet notices. */
  baseUrlDefaulted?: boolean;
  callerId?: string;
  hmacSecret?: string;
  /** Mirrors Z2TT_ALLOW_SECRET_PROMPT. Tracked explicitly now that a missing hmacSecret no longer
   * implies the prompt flag was set -- loadProfile no longer throws for a missing secret either way. */
  allowSecretPrompt?: boolean;
  capabilities?: Partial<Record<Capability, boolean>>;
}

export interface LoadProfileDeps {
  env: Record<string, string | undefined>;
  readFile: (path: string) => string;
}

function resolveBaseUrl(env: Record<string, string | undefined>): { baseUrl: string; defaulted: boolean } {
  if (env.Z2TT_BASE_URL) return { baseUrl: env.Z2TT_BASE_URL, defaulted: false };
  if (!env.Z2TT_ENV) return { baseUrl: CORE_ENGINE_BASE_URLS["z2-testnet"], defaulted: true };
  const known = CORE_ENGINE_BASE_URLS[env.Z2TT_ENV as keyof typeof CORE_ENGINE_BASE_URLS];
  if (!known) {
    throw new Error(`unknown Z2TT_ENV "${env.Z2TT_ENV}", expected one of: ${Object.keys(CORE_ENGINE_BASE_URLS).join(", ")}`);
  }
  return { baseUrl: known, defaulted: false };
}

// The signed path is derived from baseUrl's own pathname (see core-engine.ts), so a trailing
// slash here would make the signature cover "/foo" while the actual request goes to "/foo/" (or
// vice versa) -- every request then 401s, indistinguishably from a bad secret. Normalize once,
// here, regardless of where baseUrl came from (env var or a Z2TT_PROFILE file). Also reject
// anything but https: the HMAC signature authenticates the request, but sends the raw secret
// (and, for sign_credential, secretKeyMultibase) in the body -- over http that's cleartext.
function normalizeBaseUrl(url: string): string {
  const stripped = url.replace(/\/+$/, "");
  if (new URL(stripped).protocol !== "https:") {
    throw new Error(`baseUrl must use https (got "${stripped}")`);
  }
  return stripped;
}

function resolveHmacSecret(env: Record<string, string | undefined>, readFile: (path: string) => string): string | undefined {
  if (env.Z2TT_HMAC_SECRET) return env.Z2TT_HMAC_SECRET;
  if (env.Z2TT_HMAC_SECRET_FILE) return readFile(env.Z2TT_HMAC_SECRET_FILE).trim();
  return undefined;
}

export function loadProfile(deps: LoadProfileDeps): Profile {
  const allowSecretPrompt = deps.env.Z2TT_ALLOW_SECRET_PROMPT === "true";
  const profilePath = deps.env.Z2TT_PROFILE;
  if (profilePath) {
    const profile = JSON.parse(deps.readFile(profilePath)) as Profile;
    return { ...profile, baseUrl: normalizeBaseUrl(profile.baseUrl), baseUrlDefaulted: false, allowSecretPrompt };
  }

  const { baseUrl, defaulted } = resolveBaseUrl(deps.env);
  const callerId = deps.env.Z2TT_CALLER_ID;
  const hmacSecret = resolveHmacSecret(deps.env, deps.readFile);

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    baseUrlDefaulted: defaulted,
    callerId,
    hmacSecret,
    allowSecretPrompt,
    capabilities: undefined,
  };
}
