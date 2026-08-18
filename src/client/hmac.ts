import { createHash, createHmac } from "node:crypto";

export interface HmacHeaders {
  "x-client-id": string;
  "x-timestamp": string;
  "x-signature": string;
}

export interface BuildHmacHeadersParams {
  method: string;
  path: string;
  query?: string;
  body?: string;
  clientId: string;
  secret: string;
  timestampSeconds: number;
}

export function buildHmacHeaders(params: BuildHmacHeadersParams): HmacHeaders {
  const method = params.method.toUpperCase();
  const query = params.query ?? "";
  const bodyHash = hashBody(params.body ?? "");
  const message = buildCanonicalMessage(method, params.path, query, params.timestampSeconds, bodyHash);
  const signature = createHmac("sha256", params.secret).update(message).digest("hex");

  return {
    "x-client-id": params.clientId,
    "x-timestamp": String(params.timestampSeconds),
    "x-signature": signature,
  };
}

export function hashBody(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

export function buildCanonicalMessage(
  method: string,
  path: string,
  query: string,
  timestampSeconds: number,
  bodyHash: string
): string {
  return `${method}\n${path}\n${query}\n${timestampSeconds}\n${bodyHash}`;
}
