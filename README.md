# z2-trade-trust-mcp

**MCP (Model Context Protocol) server** exposing TradeTrust document/eBL operations on the Zetrix
L2 as MCP tools — a thin, HMAC-signed client over `core-engine`'s REST API. Read tools (verify,
status, finality lookups) work with just a `baseUrl`; write/workflow tools (issue, mint, transfer,
sign) are opt-in and need a caller identity.

## Install

```bash
npm install
```

Also published on npm as [`zetrix-tradetrust-mcp`](https://www.npmjs.com/package/zetrix-tradetrust-mcp).

## Configure

```bash
export Z2TT_ENV="z2-testnet"       # or "z2-mainnet" -- shortcut for the known core-engine deployments
# export Z2TT_BASE_URL="https://core-engine.example/api/z2-core-engine"  # custom deployment instead
export Z2TT_CALLER_ID="z2-trade-trust-mcp"
export Z2TT_HMAC_SECRET="…"        # issued out-of-band by whoever operates the deployment
export Z2TT_ALLOW_WRITES="true"    # omit/false to register read-only tools
```

Or point `Z2TT_PROFILE` at a JSON file instead:

```jsonc
{
  "baseUrl": "https://core-engine.example/api/z2-core-engine",
  "callerId": "z2-trade-trust-mcp",
  "hmacSecret": "…"
}
```

## Run

```bash
npm run build
node dist/index.js
```

Or run from source directly with `npm run dev` (no build step). Either way, the process listens on
stdio — it doesn't print anything on success, since MCP clients spawn it and speak the protocol
over stdin/stdout, not a human terminal session.

## Register with an MCP client

```jsonc
{
  "mcpServers": {
    "z2-trade-trust-mcp": {
      "command": "node",
      "args": ["/abs/path/dist/index.js"],
      "env": {
        "Z2TT_BASE_URL": "https://core-engine.example/api/z2-core-engine",
        "Z2TT_CALLER_ID": "z2-trade-trust-mcp",
        "Z2TT_HMAC_SECRET": "…",
        "Z2TT_ALLOW_WRITES": "false"
      }
    }
  }
}
```

### OpenClaw

If the client is [OpenClaw](https://openclaw.dev), skip the manual `mcpServers` wiring and install
[`openclaw-plugin/`](openclaw-plugin) instead — `openclaw plugins install ./openclaw-plugin`
self-registers this server and exposes the same config as plugin settings
(`network`/`baseUrl`/`callerId`/`hmacSecret`/`allowWrites`).

## License

MIT — see [LICENSE](LICENSE).
