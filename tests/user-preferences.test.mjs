import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NAVIGATION_ORDER,
  createDefaultPreferences,
  createNextPreferenceUpdatedAt,
  isNavigationOrder,
} from "../src/features/account/model/user-preferences.ts";
import {
  cachePreferencesAfterAvatarCommit,
  loadCachedUserPreferences,
  saveCachedUserPreferences,
} from "../src/features/account/storage/user-preferences-storage.ts";

test("preference edits stay newer than a future cloud timestamp", () => {
  assert.equal(
    createNextPreferenceUpdatedAt("2026-09-06T12:00:00.000Z", 0),
    "2026-09-06T12:00:00.001Z",
  );
});

test("navigation order accepts every tab exactly once", () => {
  assert.equal(isNavigationOrder(["history", "slag9", "belt", "slag8"]), true);
  assert.equal(isNavigationOrder(["history", "slag9", "belt", "belt"]), false);
  assert.equal(isNavigationOrder(["history", "slag9", "belt"]), false);
});

test("default preferences return an independent navigation array", () => {
  const preferences = createDefaultPreferences();
  assert.deepEqual(preferences.navigationOrder, DEFAULT_NAVIGATION_ORDER);
  assert.notEqual(preferences.navigationOrder, DEFAULT_NAVIGATION_ORDER);
  assert.equal(preferences.avatarPath, null);
  assert.equal(preferences.updatedAt, "1970-01-01T00:00:00.000Z");
});

test("avatar commits preserve pending navigation, including legacy fieldless caches", () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  try {
    for (const [pendingFields, expected] of [
      [undefined, true],
      [["navigationOrder"], true],
      [["avatarPath", "navigationOrder"], true],
      [["avatarPath"], false],
      [[], false],
    ]) {
      for (const avatarPath of ["user/new.webp", null]) {
        const next = { ...createDefaultPreferences(), avatarPath };
        saveCachedUserPreferences("other-user", { ...next, pending: true });
        saveCachedUserPreferences("user", { ...next, pending: true, pendingFields });
        assert.equal(cachePreferencesAfterAvatarCommit("user", next), expected);
        assert.deepEqual(loadCachedUserPreferences("user"), {
          ...next,
          pending: expected,
          pendingFields: expected ? ["navigationOrder"] : undefined,
        });
        assert.equal(loadCachedUserPreferences("other-user").pending, true);
      }
    }
    values.clear();
    assert.equal(cachePreferencesAfterAvatarCommit("user", createDefaultPreferences()), false);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
