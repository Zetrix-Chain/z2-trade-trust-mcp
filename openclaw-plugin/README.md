# zetrix-tradetrust-plugin

OpenClaw plugin for `zetrix-tradetrust-mcp` — registers a vendored, self-contained build of the
zetrix-tradetrust-mcp server (TradeTrust document issuance and eBL operations on Zetrix L2) as an
`mcp.servers` entry, with no separate `npm install`/build step for the end user.

## Install

```bash
openclaw plugins install ./openclaw-plugin
```

## Configure

Plugin settings:

| Setting | Meaning |
|---|---|
| `network` | `z2-testnet` or `z2-mainnet` (default `z2-testnet`) -- resolves the core-engine base URL automatically. Ignored if `baseUrl` is set. |
| `baseUrl` | Optional custom core-engine base URL -- overrides `network` if set. |
| `callerId` | HMAC caller id (required). |
| `hmacSecret` | HMAC secret (required). |
| `allowWrites` | Register write/workflow tools (default `false`). |

## License

MIT — see [LICENSE](../LICENSE).
