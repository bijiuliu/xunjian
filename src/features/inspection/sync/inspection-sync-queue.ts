import type { InspectionRecord } from "../model/types";
import { isInspectionRecord } from "../storage/inspection-backup";

const SYNC_QUEUE_PREFIX = "night-inspection-sync-queue:";

export type InspectionSyncOperation =
  | {
      operationId: string;
      type: "upsert";
      record: InspectionRecord;
    }
  | {
      operationId: string;
      type: "delete";
      ids: string[];
    }
  | {
      operationId: string;
      type: "merge" | "replace";
      records: InspectionRecord[];
    };

type NewInspectionSyncOperation =
  | { type: "upsert"; record: InspectionRecord }
  | { type: "delete"; ids: string[] }
  | { type: "merge" | "replace"; records: InspectionRecord[] };

const flushes = new Map<string, Promise<void>>();

export function enqueueInspectionSyncOperation(
  userId: string,
  operation: NewInspectionSyncOperation,
) {
  const queued: InspectionSyncOperation = {
    ...operation,
    operationId: crypto.randomUUID(),
  } as InspectionSyncOperation;
  saveInspectionSyncQueue(userId, [
    ...loadInspectionSyncQueue(userId),
    queued,
  ]);
  return queued.operationId;
}

export function getPendingInspectionSyncCount(userId: string) {
  return loadInspectionSyncQueue(userId).length;
}

export function flushInspectionSyncQueue(
  userId: string,
  apply: (operation: InspectionSyncOperation) => Promise<void>,
) {
  const current = flushes.get(userId);
  if (current) return current;

  const flush = flushQueue(userId, apply).finally(() => {
    if (flushes.get(userId) === flush) flushes.delete(userId);
  });
  flushes.set(userId, flush);
  return flush;
}

async function flushQueue(
  userId: string,
  apply: (operation: InspectionSyncOperation) => Promise<void>,
) {
  while (true) {
    const operation = loadInspectionSyncQueue(userId)[0];
    if (!operation) return;

    await apply(operation);

    // Reload before acknowledging success. Operations appended while this
    // request was in flight must remain queued.
    const latest = loadInspectionSyncQueue(userId);
    saveInspectionSyncQueue(
      userId,
      latest.filter((item) => item.operationId !== operation.operationId),
    );
  }
}

export function loadInspectionSyncQueue(
  userId: string,
): InspectionSyncOperation[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(`${SYNC_QUEUE_PREFIX}${userId}`) || "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];

    let migrated = false;
    const queue = parsed.flatMap((value) => {
      const operation = parseInspectionSyncOperation(value);
      if (!operation) return [];
      if (!(value as { operationId?: unknown }).operationId) migrated = true;
      return [operation];
    });
    if (migrated) saveInspectionSyncQueue(userId, queue);
    return queue;
  } catch {
    return [];
  }
}

function saveInspectionSyncQueue(
  userId: string,
  queue: InspectionSyncOperation[],
) {
  const key = `${SYNC_QUEUE_PREFIX}${userId}`;
  if (queue.length === 0) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(queue));
}

function parseInspectionSyncOperation(
  value: unknown,
): InspectionSyncOperation | null {
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const candidate = value as Partial<InspectionSyncOperation>;
  const operationId =
    typeof candidate.operationId === "string"
      ? candidate.operationId
      : crypto.randomUUID();

  if (candidate.type === "upsert" && isInspectionRecord(candidate.record)) {
    return { operationId, type: "upsert", record: candidate.record };
  }
  if (
    candidate.type === "delete" &&
    Array.isArray(candidate.ids) &&
    candidate.ids.every((id) => typeof id === "string")
  ) {
    return { operationId, type: "delete", ids: candidate.ids };
  }
  if (
    (candidate.type === "merge" || candidate.type === "replace") &&
    Array.isArray(candidate.records) &&
    candidate.records.every(isInspectionRecord)
  ) {
    return {
      operationId,
      type: candidate.type,
      records: candidate.records,
    };
  }

  return null;
}
