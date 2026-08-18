import { join } from "node:path";

export function resolveVendoredServerPath(pluginRootDir: string): string {
  return join(pluginRootDir, "dist-vendored", "z2-trade-trust-mcp-server.js");
}
