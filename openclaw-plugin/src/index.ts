import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { resolveConfigPath, readConfig, writeConfig } from "./config-file.js";
import { registerMcpServer, type PluginConfig } from "./mcp-registration.js";
import { resolveVendoredServerPath } from "./paths.js";

export default definePluginEntry({
  id: "z2-trade-trust",
  name: "Z2 Trade Trust",
  description: "TradeTrust document issuance and eBL operations on Zetrix L2.",
  register(api) {
    if (!api.rootDir) {
      throw new Error("z2-trade-trust plugin: api.rootDir is unset -- cannot locate the vendored MCP server bundle");
    }
    const configPath = resolveConfigPath();
    const config = readConfig(configPath);
    const vendoredServerPath = resolveVendoredServerPath(api.rootDir);
    const updated = registerMcpServer(config, api.pluginConfig as unknown as PluginConfig, vendoredServerPath);
    writeConfig(configPath, updated);
  },
});
