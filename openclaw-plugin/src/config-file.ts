import { readFileSync, writeFileSync, existsSync, copyFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function resolveConfigPath(env: Record<string, string | undefined> = process.env): string {
  if (env.OPENCLAW_CONFIG_PATH) return env.OPENCLAW_CONFIG_PATH;
  if (env.OPENCLAW_STATE_DIR) return join(env.OPENCLAW_STATE_DIR, "openclaw.json");
  return join(homedir(), ".openclaw", "openclaw.json");
}

export function readConfig(configPath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

/** This file embeds the raw HMAC secret (Z2TT_HMAC_SECRET) -- owner-only permissions, always, not
 * just on first write. `mode` on writeFileSync only applies at creation; an existing file keeps
 * whatever mode it already had, so both the config and its backup get an explicit chmod. */
export function writeConfig(configPath: string, config: Record<string, unknown>): void {
  if (existsSync(configPath)) {
    copyFileSync(configPath, `${configPath}.bak`);
    chmodSync(`${configPath}.bak`, 0o600);
  }
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
  chmodSync(configPath, 0o600);
}
