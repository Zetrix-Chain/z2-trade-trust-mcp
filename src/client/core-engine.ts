import { buildHmacHeaders } from "./hmac.js";
import { classifyNotFound } from "../config/capabilities.js";
import { BadRequestError, UnauthorizedError, RateLimitError, ServerError, CoreEngineError } from "../errors.js";
import type { CoreEngineClient } from "./types.js";
import type { Profile } from "../config/profile.js";

export interface CoreEngineClientOptions {
  timeoutMs?: number;
  getSecret?: () => Promise<string>;
}

export function createCoreEngineClient(profile: Profile, options: CoreEngineClientOptions = {}): CoreEngineClient {
  const timeoutMs = options.timeoutMs ?? 30000;
  const maybeSecretProvider =
    options.getSecret ?? (profile.hmacSecret !== undefined ? async () => profile.hmacSecret as string : undefined);
  if (!maybeSecretProvider) {
    throw new Error("createCoreEngineClient: profile.hmacSecret is unset and no getSecret was provided");
  }
  const secretProvider: () => Promise<string> = maybeSecretProvider;
  // core-engine signs against the FULL path it receives (e.g. "/api/z2-core-engine/health"), not
  // just the route suffix -- baseUrl's own path segment must be folded into the signed path, even
  // though it was already correctly part of the actual fetch URL.
  const basePathPrefix = new URL(profile.baseUrl).pathname.replace(/\/$/, "");

  async function request<T>(method: "GET" | "POST", path: string, query?: Record<string, string>, body?: unknown): Promise<T> {
    const queryString = query ? new URLSearchParams(query).toString() : "";
    const url = `${profile.baseUrl}${path}${queryString ? `?${queryString}` : ""}`;
    const bodyText = body !== undefined ? JSON.stringify(body) : "";
    const timestampSeconds = Math.floor(Date.now() / 1000);
    const secret = await secretProvider();
    const hmacHeaders = buildHmacHeaders({
      method,
      path: `${basePathPrefix}${path}`,
      query: queryString,
      body: bodyText,
      clientId: profile.callerId,
      secret,
      timestampSeconds,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { "content-type": "application/json", ...hmacHeaders },
        body: body !== undefined ? bodyText : undefined,
        signal: controller.signal,
      });
    } catch (cause) {
      const aborted = controller.signal.aborted;
      throw new CoreEngineError(
        aborted
          ? `request to ${path} timed out after ${timeoutMs}ms`
          : `request to ${path} failed: ${(cause as Error).message}`,
        0,
        { cause }
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    // A gateway/proxy in front of core-engine can return a non-JSON body (e.g. an HTML error page
    // on a 502) -- JSON.parse must not throw a raw SyntaxError that bypasses the status-mapping
    // ladder below. Fall back to undefined; the ladder already handles a missing responseBody via
    // response.statusText.
    let responseBody: { error?: string; message?: string } | undefined;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = undefined;
      }
    }
    if (response.ok) return responseBody as T;

    // core-engine's global error handler always sends { error: err.message } on 4xx/5xx (its
    // server.ts setErrorHandler), never { message: ... } -- reading the wrong field here silently
    // discarded every specific error core-engine ever returned in favor of the generic HTTP status
    // text.
    const message = (responseBody && (responseBody.error || responseBody.message)) || response.statusText;
    if (response.status === 400) throw new BadRequestError(message);
    if (response.status === 401) throw new UnauthorizedError(message);
    if (response.status === 404) throw classifyNotFound(path, message);
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new RateLimitError(message, { retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : undefined });
    }
    if (response.status >= 500) throw new ServerError(message, response.status);
    throw new CoreEngineError(message, response.status);
  }

  return {
    get: (path, query) => request("GET", path, query),
    post: (path, body) => request("POST", path, undefined, body),
  };
}
