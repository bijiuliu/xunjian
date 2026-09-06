import assert from "node:assert/strict";
import test from "node:test";

import {
  enqueueInspectionSyncOperation,
  flushInspectionSyncQueue,
  getPendingInspectionSyncCount,
  loadInspectionSyncQueue,
} from "../src/features/inspection/sync/inspection-sync-queue.ts";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function record(id) {
  return {
    id,
    date: "2026/9/6",
    time: "2026/9/6 08:00:00",
    createdAt: "2026-09-06T00:00:00.000Z",
    values: { temperature: "42" },
  };
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

test("operations appended during a flush are not cleared", async () => {
  const userId = "queue-race";
  enqueueInspectionSyncOperation(userId, {
    type: "upsert",
    record: record("one"),
  });

  const applied = [];
  await flushInspectionSyncQueue(userId, async (operation) => {
    applied.push(operation.type);
    if (operation.type === "upsert") {
      enqueueInspectionSyncOperation(userId, {
        type: "delete",
        ids: [operation.record.id],
      });
    }
  });

  assert.deepEqual(applied, ["upsert", "delete"]);
  assert.equal(getPendingInspectionSyncCount(userId), 0);
});

test("a failed operation remains queued with the same operation id", async () => {
  const userId = "queue-failure";
  enqueueInspectionSyncOperation(userId, {
    type: "delete",
    ids: ["one"],
  });
  const before = loadInspectionSyncQueue(userId)[0];

  await assert.rejects(
    flushInspectionSyncQueue(userId, async () => {
      throw new Error("offline");
    }),
    /offline/,
  );

  const after = loadInspectionSyncQueue(userId)[0];
  assert.equal(after.operationId, before.operationId);
  assert.equal(after.type, "delete");
});

test("legacy operations receive a stable id when loaded", () => {
  const userId = "legacy-queue";
  localStorage.setItem(
    `night-inspection-sync-queue:${userId}`,
    JSON.stringify([{ type: "upsert", record: record("legacy") }]),
  );

  const first = loadInspectionSyncQueue(userId)[0];
  const second = loadInspectionSyncQueue(userId)[0];
  assert.equal(typeof first.operationId, "string");
  assert.equal(second.operationId, first.operationId);
});
