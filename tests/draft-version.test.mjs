import assert from "node:assert/strict";
import test from "node:test";

import {
  createNextDraftUpdatedAt,
  parseDraftPushResult,
  reconcileInspectionDraft,
} from "../src/features/inspection/model/draft-reconciliation.ts";

const oldDraft = {
  values: { field: "old" },
  beltTab: "SZ101",
  updatedAt: "2026-08-31T21:00:00.000Z",
};
const newDraft = {
  values: { field: "new" },
  beltTab: "SZ201",
  updatedAt: "2026-08-31T22:00:00.000Z",
};

test("newer cloud draft wins without uploading local", async () => {
  let pushes = 0;
  const result = await reconcileInspectionDraft({
    localDraft: oldDraft,
    fetchCloud: async () => newDraft,
    pushLocal: async () => {
      pushes += 1;
      return "committed";
    },
  });
  assert.deepEqual(result, newDraft);
  assert.equal(pushes, 0);
});

test("newer local draft is uploaded", async () => {
  const pushed = [];
  const result = await reconcileInspectionDraft({
    localDraft: newDraft,
    fetchCloud: async () => oldDraft,
    pushLocal: async (draft) => {
      pushed.push(draft);
      return "committed";
    },
  });
  assert.deepEqual(result, newDraft);
  assert.deepEqual(pushed, [newDraft]);
});

test("equal versions use the confirmed cloud copy", async () => {
  const cloud = { ...newDraft, values: { field: "cloud" } };
  const result = await reconcileInspectionDraft({
    localDraft: newDraft,
    fetchCloud: async () => cloud,
    pushLocal: async () => {
      throw new Error("equal version must not be pushed");
    },
  });
  assert.deepEqual(result, cloud);
});

test("legacy unversioned local draft cannot outrank cloud", async () => {
  const result = await reconcileInspectionDraft({
    localDraft: { values: { field: "legacy" }, beltTab: "SZ101" },
    fetchCloud: async () => newDraft,
    pushLocal: async () => {
      throw new Error("legacy draft must not overwrite cloud");
    },
  });
  assert.deepEqual(result, newDraft);
});

test("real edits always receive a strictly newer timestamp", () => {
  const previous = "2026-08-31T22:00:00.000Z";
  assert.equal(
    createNextDraftUpdatedAt(previous, Date.parse(previous)),
    "2026-08-31T22:00:00.001Z",
  );
});

test("RPC boolean values map to committed and stale", () => {
  assert.equal(parseDraftPushResult(true), "committed");
  assert.equal(parseDraftPushResult(false), "stale");
  assert.throws(() => parseDraftPushResult(null));
});

test("device A offline edit uploads and device B receives it", async () => {
  let cloud = oldDraft;
  const pushLocal = async (draft) => {
    if (Date.parse(draft.updatedAt) < Date.parse(cloud.updatedAt)) return "stale";
    cloud = draft;
    return "committed";
  };

  const deviceA = await reconcileInspectionDraft({
    localDraft: newDraft,
    fetchCloud: async () => cloud,
    pushLocal,
  });
  const deviceB = await reconcileInspectionDraft({
    localDraft: oldDraft,
    fetchCloud: async () => cloud,
    pushLocal,
  });

  assert.deepEqual(deviceA, newDraft);
  assert.deepEqual(deviceB, newDraft);
  assert.deepEqual(cloud, newDraft);
});

test("stale RPC result refetches the concurrent cloud winner", async () => {
  let fetches = 0;
  const concurrentCloud = {
    ...newDraft,
    updatedAt: "2026-08-31T23:00:00.000Z",
  };
  const result = await reconcileInspectionDraft({
    localDraft: newDraft,
    fetchCloud: async () => {
      fetches += 1;
      return fetches === 1 ? oldDraft : concurrentCloud;
    },
    pushLocal: async () => "stale",
  });
  assert.equal(fetches, 2);
  assert.deepEqual(result, concurrentCloud);
});

test("opening a legacy cache does not overwrite versioned cloud data", async () => {
  let pushed = false;
  const result = await reconcileInspectionDraft({
    localDraft: { values: { field: "cached" }, beltTab: "SZ101" },
    fetchCloud: async () => newDraft,
    pushLocal: async () => {
      pushed = true;
      return "committed";
    },
    now: () => Date.parse("2026-08-31T23:30:00.000Z"),
  });
  assert.equal(pushed, false);
  assert.deepEqual(result, newDraft);
});

test("a versioned empty draft is uploaded", async () => {
  const emptyDraft = {
    values: {},
    beltTab: "SZ101",
    updatedAt: "2026-08-31T23:00:00.000Z",
  };
  let pushed = null;
  const result = await reconcileInspectionDraft({
    localDraft: emptyDraft,
    fetchCloud: async () => oldDraft,
    pushLocal: async (draft) => {
      pushed = draft;
      return "committed";
    },
  });
  assert.deepEqual(pushed, emptyDraft);
  assert.deepEqual(result, emptyDraft);
});

test("missing local and cloud drafts do not invent a version", async () => {
  const result = await reconcileInspectionDraft({
    localDraft: null,
    fetchCloud: async () => null,
    pushLocal: async () => {
      throw new Error("nothing should be pushed");
    },
  });
  assert.equal(result, null);
});
