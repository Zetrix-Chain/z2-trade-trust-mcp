import type { Capability } from "./capabilities.js";

export const CORE_ENGINE_BASE_URLS = {
  "z2-testnet": "https://api-tradetrust-sandbox.zetrix.com/api/z2-core-engine",
  "z2-mainnet": "https://api-tradetrust.zetrix.com/api/z2-core-engine",
} as const;

export interface Profile {
  baseUrl: string;
  callerId: string;
  hmacSecret?: string;
  capabilities?: Partial<Record<Capability, boolean>>;
}

export interface LoadProfileDeps {
  env: Record<string, string | undefined>;
  readFile: (path: string) => string;
}

function resolveBaseUrl(env: Record<string, string | undefined>): string | undefined {
  if (env.Z2TT_BASE_URL) return env.Z2TT_BASE_URL;
  if (!env.Z2TT_ENV) return undefined;
  const known = CORE_ENGINE_BASE_URLS[env.Z2TT_ENV as keyof typeof CORE_ENGINE_BASE_URLS];
  if (!known) {
    throw new Error(`unknown Z2TT_ENV "${env.Z2TT_ENV}", expected one of: ${Object.keys(CORE_ENGINE_BASE_URLS).join(", ")}`);
  }
  return known;
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
  const profilePath = deps.env.Z2TT_PROFILE;
  if (profilePath) {
    const profile = JSON.parse(deps.readFile(profilePath)) as Profile;
    return { ...profile, baseUrl: normalizeBaseUrl(profile.baseUrl) };
  }

  const baseUrl = resolveBaseUrl(deps.env);
  const callerId = deps.env.Z2TT_CALLER_ID;
  const hmacSecret = resolveHmacSecret(deps.env, deps.readFile);

  if (!baseUrl || !callerId) {
    throw new Error("no profile source configured");
  }
  // Distinct from the check above: baseUrl/callerId are fine here, only the secret is missing --
  // a shared "no profile source configured" message would point an operator at the wrong half of
  // their config.
  if (!hmacSecret && deps.env.Z2TT_ALLOW_SECRET_PROMPT !== "true") {
    throw new Error(
      "no hmac secret configured -- set Z2TT_HMAC_SECRET, Z2TT_HMAC_SECRET_FILE, or Z2TT_ALLOW_SECRET_PROMPT=true"
    );
  }

  return { baseUrl: normalizeBaseUrl(baseUrl), callerId, hmacSecret, capabilities: undefined };
}
