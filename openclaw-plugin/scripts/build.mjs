import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(__dirname, "..");
const repoRoot = join(pluginRoot, "..");

await build({
  entryPoints: [join(repoRoot, "dist", "index.js")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(pluginRoot, "dist-vendored", "z2-trade-trust-mcp-server.js"),
});
console.log("Vendored MCP server -> dist-vendored/z2-trade-trust-mcp-server.js");

await build({
  entryPoints: [join(pluginRoot, "src", "index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["openclaw"],
  outfile: join(pluginRoot, "dist", "index.js"),
});
console.log("Plugin entry -> dist/index.js");
