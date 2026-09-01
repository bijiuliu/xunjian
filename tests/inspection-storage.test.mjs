import assert from "node:assert/strict";
import test from "node:test";

import {
  DRAFT_STORAGE_KEY,
  RECORDS_STORAGE_KEY,
  loadInspectionState,
  prepareStorageForUser,
} from "../src/features/inspection/storage/inspection-storage.ts";

class MemoryStorage {
  #values = new Map();

  clear() {
    this.#values.clear();
  }

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  removeItem(key) {
    this.#values.delete(key);
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage();

test.beforeEach(() => localStorage.clear());

test("legacy values-only drafts remain readable", () => {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ legacy: "8" }));
  assert.deepEqual(loadInspectionState(), {
    records: [],
    values: { legacy: "8" },
    beltTab: "SZ101",
    draftUpdatedAt: null,
    hasDraft: true,
  });
});

test("an empty versioned draft is distinct from no draft", () => {
  localStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify({
      values: {},
      beltTab: "SZ201-N",
      updatedAt: "2026-09-01T00:00:00.000Z",
    }),
  );
  const state = loadInspectionState();
  assert.equal(state.hasDraft, true);
  assert.equal(state.beltTab, "SZ201-N");
  assert.equal(state.draftUpdatedAt, "2026-09-01T00:00:00.000Z");
});

test("invalid stored JSON is discarded without affecting valid records", () => {
  localStorage.setItem(DRAFT_STORAGE_KEY, "{");
  localStorage.setItem(
    RECORDS_STORAGE_KEY,
    JSON.stringify([
      {
        id: "record",
        date: "2026-09-01",
        time: "2026-09-01 01:00",
        values: {},
      },
    ]),
  );
  const state = loadInspectionState();
  assert.equal(state.records.length, 1);
  assert.equal(state.hasDraft, false);
  assert.equal(localStorage.getItem(DRAFT_STORAGE_KEY), null);
});

test("legacy account caches infer an empty versioned draft", () => {
  localStorage.setItem("night-inspection-owner", "first-user");
  localStorage.setItem(
    "night-inspection-account:second-user",
    JSON.stringify({
      records: [],
      values: {},
      beltTab: "SZ201",
      draftUpdatedAt: "2026-09-01T01:00:00.000Z",
    }),
  );

  const state = prepareStorageForUser("second-user");
  assert.equal(state.hasDraft, true);
  assert.equal(state.beltTab, "SZ201");
  assert.notEqual(localStorage.getItem(DRAFT_STORAGE_KEY), null);
});
