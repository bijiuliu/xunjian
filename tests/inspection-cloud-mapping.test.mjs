import assert from "node:assert/strict";
import test from "node:test";
import {
  fromCloudRecord,
  isCloudDraft,
  isCloudRecord,
  toCloudRecord,
} from "../src/features/inspection/sync/inspection-cloud-mapping.ts";
import {
  isInspectionRecord,
  isInspectionValues,
} from "../src/features/inspection/model/validation.ts";

const record = {
  id: "record-1",
  date: "2026/9/9",
  time: "2026/9/9 08:00:00",
  createdAt: "2026-09-09T00:00:00.000Z",
  values: { temperature: "42", legacy_water: "✓" },
};

const row = {
  ...toCloudRecord(record),
  user_id: "user-1",
  created_at: "2026-09-09T01:00:00.000Z",
  updated_at: "2026-09-09T01:00:00.000Z",
  deleted_at: null,
};

test("record mapping preserves business fields without inventing restore semantics", () => {
  assert.deepEqual(toCloudRecord(record), {
    id: record.id,
    inspection_date: record.date,
    inspection_time: record.time,
    recorded_at: record.createdAt,
    values: record.values,
  });
  assert.deepEqual(fromCloudRecord(row), record);
  assert.equal(isCloudRecord({ ...row, deleted_at: row.updated_at }), true);
});

test("legacy cloud time uses the inspection time before the upload time", () => {
  const legacy = { ...row, recorded_at: null };
  assert.equal(
    fromCloudRecord(legacy).createdAt,
    new Date(2026, 8, 9, 8, 0, 0).toISOString(),
  );
  assert.equal(
    fromCloudRecord({ ...legacy, inspection_time: "unknown" }).createdAt,
    row.created_at,
  );
  assert.equal(toCloudRecord({ ...record, createdAt: undefined, time: "unknown" }).recorded_at, null);
});

test("storage and cloud guards reject non-string values but retain legacy fields", () => {
  for (const invalid of [null, [], "value", { temperature: 42 }]) {
    assert.equal(isInspectionValues(invalid), false);
    assert.equal(isInspectionRecord({ ...record, values: invalid }), false);
    assert.equal(isCloudRecord({ ...row, values: invalid }), false);
    assert.equal(isCloudDraft({ user_id: "user-1", values: invalid, belt_tab: "SZ101", updated_at: row.updated_at }), false);
  }
  assert.equal(isInspectionRecord(record), true);
  assert.equal(isInspectionRecord({ ...record, createdAt: "invalid" }), false);
  assert.equal(isInspectionRecord({ ...record, id: " " }), false);
  const legacy = { id: record.id, date: record.date, time: record.time, values: record.values };
  assert.equal(isInspectionRecord(legacy), true);
  assert.equal(isCloudDraft({ user_id: "user-1", values: {}, belt_tab: "SZ101", updated_at: row.updated_at }), true);
  assert.equal(isCloudDraft({ user_id: "user-1", values: {}, belt_tab: "other", updated_at: row.updated_at }), false);
});
