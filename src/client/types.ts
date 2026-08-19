/**
 * The interface every tool calls through -- a generic HTTP+HMAC transport
 * (src/client/core-engine.ts is the concrete implementation).
 */
export interface CoreEngineClient {
  get<T>(path: string, query?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}
