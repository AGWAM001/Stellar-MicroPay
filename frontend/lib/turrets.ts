/**
 * lib/turrets.ts
 * Frontend API helpers for Turrets txFunctions.
 */

import { apiFetch } from "./api";

export type TurretsType = "dca" | "stop_loss";

export interface TurretsDeployment {
  id: string;
  ownerPublicKey: string;
  type: TurretsType;
  status: "active" | "paused";
  config: Record<string, unknown>;
  deploymentHash: string;
  createdAt: string;
  nextRunAt: string | null;
  lastExecutedAt: string | null;
  lastCheckedAt: string | null;
  lastObservedPriceUsd: number | null;
  lastError: string | null;
}

export interface TurretsExecutionHistory {
  id: string;
  deploymentId: string;
  status: string;
  message: string;
  result: Record<string, unknown> | null;
  createdAt: string;
}

export function createTurretsChallenge(params: {
  ownerPublicKey: string;
  type: TurretsType;
  config: Record<string, unknown>;
}) {
  return apiFetch<{
    challengeXDR: string;
    deploymentHash: string;
    normalizedConfig: Record<string, unknown>;
    networkPassphrase: string;
  }>("/api/turrets/challenge", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function deployTurretsFunction(params: {
  ownerPublicKey: string;
  type: TurretsType;
  config: Record<string, unknown>;
  deploymentHash: string;
  signedChallengeXDR: string;
}) {
  return apiFetch<TurretsDeployment>("/api/turrets/deploy", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function listTurretsFunctions(ownerPublicKey: string) {
  return apiFetch<TurretsDeployment[]>(
    `/api/turrets?ownerPublicKey=${encodeURIComponent(ownerPublicKey)}`,
  );
}

export function getTurretsHistory(id: string) {
  return apiFetch<TurretsExecutionHistory[]>(
    `/api/turrets/${encodeURIComponent(id)}/history`,
  );
}

export function pauseTurretsFunction(id: string) {
  return apiFetch<TurretsDeployment>(
    `/api/turrets/${encodeURIComponent(id)}/pause`,
    { method: "POST" },
  );
}

export function resumeTurretsFunction(id: string) {
  return apiFetch<TurretsDeployment>(
    `/api/turrets/${encodeURIComponent(id)}/resume`,
    { method: "POST" },
  );
}
