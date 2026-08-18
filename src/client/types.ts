/**
 * The interface every tool calls through. The concrete implementation
 * (src/client/core-engine.ts) is a generic HTTP+HMAC transport rather than a dependency on the
 * Node SDK.
 */
export interface CoreEngineClient {
  get<T>(path: string, query?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}
