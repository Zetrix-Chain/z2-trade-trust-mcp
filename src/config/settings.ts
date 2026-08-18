/** Write/workflow tools are registered only when this is exactly "true" -- unset means absent. */
export function isWritesAllowed(env: Record<string, string | undefined>): boolean {
  return env.Z2TT_ALLOW_WRITES === "true";
}
