import { join } from "node:path";

export function resolveVendoredServerPath(pluginRootDir: string): string {
  return join(pluginRootDir, "dist-vendored", "zetrix-tradetrust-mcp-server.js");
}
