import type { CoreEngineClient } from "../client/types.js";

export interface HealthCheckResult {
  status: string;
}

export function healthCheck(client: CoreEngineClient): Promise<HealthCheckResult> {
  return client.get<HealthCheckResult>("/health");
}
