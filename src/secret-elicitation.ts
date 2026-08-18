// `params` is deliberately loose (not the SDK's own stricter ElicitRequestFormParams union) --
// this interface exists purely as a minimal, trivially mockable test seam. A real Server's
// elicitInput has a narrower, more specific params type, so typing this any tighter than `any`
// makes `Server` fail structural assignability against this interface.
export interface ElicitingServer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elicitInput(params: any): Promise<{ action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> }>;
}

/** Resolves the HMAC secret by asking the connected MCP client to prompt the human, via the
 * protocol's own elicitation capability -- never through a chat message, never persisted.
 * Caches the accepted value for this process's lifetime; never re-elicits. */
export function createElicitingSecretProvider(server: ElicitingServer, callerId: string): () => Promise<string> {
  let cached: string | undefined;

  return async () => {
    if (cached !== undefined) return cached;

    const result = await server.elicitInput({
      message: `z2-trade-trust-mcp needs the HMAC secret issued for caller "${callerId}" to authenticate to core-engine. It is never logged or persisted -- only kept in memory for this process's lifetime.`,
      requestedSchema: {
        type: "object",
        properties: { secret: { type: "string", title: "HMAC secret" } },
        required: ["secret"],
      },
    });

    if (result.action !== "accept" || typeof result.content?.secret !== "string" || !result.content.secret) {
      throw new Error("HMAC secret elicitation was declined, cancelled, or returned no value");
    }

    cached = result.content.secret;
    return cached;
  };
}
