import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NAVIGATION_ORDER,
  createDefaultPreferences,
  isNavigationOrder,
} from "../src/features/account/model/user-preferences.ts";

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
