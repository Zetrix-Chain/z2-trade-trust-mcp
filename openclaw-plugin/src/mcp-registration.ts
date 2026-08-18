// Mirrors src/config/profile.ts's CORE_ENGINE_BASE_URLS (z2-testnet/z2-mainnet) in the main package --
// duplicated here (not imported across the package boundary) so this plugin package stays
// self-contained and independently buildable. Keep both in sync if these ever change.
export const NETWORK_BASE_URLS = {
  "z2-testnet": "https://api-tradetrust-sandbox.zetrix.com/api/z2-core-engine",
  "z2-mainnet": "https://api-tradetrust.zetrix.com/api/z2-core-engine",
} as const;

export type Network = keyof typeof NETWORK_BASE_URLS;

export interface PluginConfig {
  network?: Network;
  baseUrl?: string;
  callerId: string;
  hmacSecret: string;
  allowWrites?: boolean;
}

export const SERVER_NAME = "z2-trade-trust";
export const OWNERSHIP_MARKER = "_managedByZ2TradeTrustPlugin";

/** Explicit baseUrl always wins; otherwise resolved from network, defaulting to z2-testnet. */
export function resolveBaseUrl(pluginConfig: PluginConfig): string {
  if (pluginConfig.baseUrl) return pluginConfig.baseUrl;
  return NETWORK_BASE_URLS[pluginConfig.network ?? "z2-testnet"];
}

export function buildServerEntry(pluginConfig: PluginConfig, vendoredServerPath: string): Record<string, unknown> {
  return {
    [OWNERSHIP_MARKER]: true,
    command: "node",
    args: [vendoredServerPath],
    env: {
      Z2TT_BASE_URL: resolveBaseUrl(pluginConfig),
      Z2TT_CALLER_ID: pluginConfig.callerId,
      Z2TT_HMAC_SECRET: pluginConfig.hmacSecret,
      Z2TT_ALLOW_WRITES: String(pluginConfig.allowWrites ?? false),
    },
  };
}

export function registerMcpServer(
  config: Record<string, unknown>,
  pluginConfig: PluginConfig,
  vendoredServerPath: string
): Record<string, unknown> {
  const mcp = (config.mcp as { servers?: Record<string, unknown> } | undefined) ?? {};
  const servers = mcp.servers ?? {};
  const existing = servers[SERVER_NAME] as Record<string, unknown> | undefined;

  if (existing && existing[OWNERSHIP_MARKER] !== true) {
    throw new Error(
      `mcp.servers.${SERVER_NAME} already exists and was not created by this plugin -- remove it manually first.`
    );
  }

  return {
    ...config,
    mcp: {
      ...mcp,
      servers: { ...servers, [SERVER_NAME]: buildServerEntry(pluginConfig, vendoredServerPath) },
    },
  };
}
