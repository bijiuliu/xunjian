import assert from "node:assert/strict";
import test from "node:test";

import {
  createInspectionBackup,
  mergeInspectionRecords,
  parseInspectionBackup,
} from "../src/features/inspection/storage/inspection-backup.ts";

const oldRecord = {
  id: "old",
  date: "2026-08-30",
  time: "2026-08-30 22:00",
  createdAt: "2026-08-30T14:00:00.000Z",
  values: { field: "old" },
};
const newRecord = {
  id: "new",
  date: "2026-08-31",
  time: "2026-08-31 22:00",
  createdAt: "2026-08-31T14:00:00.000Z",
  values: { field: "new" },
};

test("versioned backups round-trip without losing records", () => {
  const preview = parseInspectionBackup(
    createInspectionBackup([newRecord]),
    "backup.json",
    [],
  );
  assert.equal(preview.fileName, "backup.json");
  assert.equal(preview.newRecordCount, 1);
  assert.equal(preview.duplicateCount, 0);
  assert.equal(preview.invalidCount, 0);
  assert.deepEqual(preview.records, [newRecord]);
});

test("legacy arrays skip invalid and duplicate records", () => {
  const legacyRecord = {
    id: "legacy",
    date: "2026-08-29",
    time: "2026-08-29 22:00",
    values: { field: "legacy" },
  };
  const preview = parseInspectionBackup(
    JSON.stringify([legacyRecord, legacyRecord, { id: "broken" }, oldRecord]),
    "legacy.json",
    [oldRecord],
  );

  assert.equal(preview.newRecordCount, 1);
  assert.equal(preview.duplicateCount, 2);
  assert.equal(preview.invalidCount, 1);
  assert.equal(preview.records.length, 2);
  assert.equal(typeof preview.records[0].createdAt, "string");
});

test("merge keeps existing IDs and sorts additions newest first", () => {
  const conflicting = { ...newRecord, id: "old", values: { field: "replace" } };
  assert.deepEqual(
    mergeInspectionRecords([oldRecord], [conflicting, newRecord]),
    [newRecord, oldRecord],
  );
});

test("unsupported or malformed backups are rejected", () => {
  assert.throws(
    () => parseInspectionBackup("not-json", "bad.json", []),
    /有效的 JSON/,
  );
  assert.throws(
    () => parseInspectionBackup('{"app":"other","records":[]}', "bad.json", []),
    /支持的备份文件/,
  );
});
