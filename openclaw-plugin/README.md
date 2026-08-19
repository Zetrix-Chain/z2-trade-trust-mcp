# zetrix-tradetrust-plugin

OpenClaw plugin for `zetrix-tradetrust-mcp` — registers a vendored, self-contained build of the
zetrix-tradetrust-mcp server (TradeTrust document issuance and eBL operations on Zetrix L2) as an
`mcp.servers` entry, with no separate `npm install`/build step for the end user.

## Install

```bash
openclaw plugins install ./openclaw-plugin
```

Every setting below is optional. Installing with none set still registers `health_check`,
`verify_credential`, `verify_ebl`, and `list_document_types` -- enough to verify documents and
check liveness with zero configuration. Add `callerId`/`hmacSecret` any time (edit the config,
restart the gateway) to unlock the rest -- no reinstall needed.

## Configure

Plugin settings:

| Setting | Meaning |
|---|---|
| `network` | `z2-testnet` or `z2-mainnet` (default `z2-testnet`) -- resolves the core-engine base URL automatically. Ignored if `baseUrl` is set. |
| `baseUrl` | Optional custom core-engine base URL -- overrides `network` if set. |
| `callerId` | HMAC caller id. Omit alongside `hmacSecret` for the zero-config tier above. |
| `hmacSecret` | HMAC secret for that caller id. Omit alongside `callerId` for the zero-config tier above. |
| `allowWrites` | Register write/workflow tools (default `false`). Has no effect until `callerId`/`hmacSecret` are both set. |

## License

MIT — see [LICENSE](../LICENSE).
