import assert from "node:assert/strict";
import test from "node:test";

import {
  fieldKey,
  getBeltPoints,
  getVisibleBeltItems,
  selectPump,
} from "../src/features/inspection/model/field-rules.ts";

test("selecting an occupied pump swaps the two cards", () => {
  const first = fieldKey("slag8", "冲渣泵", "0", "no");
  const second = fieldKey("slag8", "冲渣泵", "1", "no");
  const reading = fieldKey("slag8", "冲渣泵", "0", "south");
  const values = { [first]: "101", [second]: "102", [reading]: "8" };

  assert.deepEqual(selectPump(values, "slag8", "冲渣泵", 0, "102"), {
    [first]: "102",
    [second]: "101",
    [reading]: "8",
  });
});

test("selecting the other card's pump from an empty card clears the other card", () => {
  const first = fieldKey("slag9", "上塔泵", "0", "no");
  const second = fieldKey("slag9", "上塔泵", "1", "no");

  assert.deepEqual(
    selectPump({ [second]: "2#" }, "slag9", "上塔泵", 0, "2#"),
    { [first]: "2#", [second]: "" },
  );
});

test("belt visibility keeps the confirmed equipment matrix", () => {
  assert.deepEqual(getVisibleBeltItems("SZ101"), [
    "电机 / 减速机",
    "头轮",
    "头增面轮",
    "尾轮",
  ]);
  assert.equal(getVisibleBeltItems("SZ201").includes("液力耦合器"), false);
  assert.equal(getVisibleBeltItems("SZ201").includes("头增面轮"), false);
  assert.equal(getVisibleBeltItems("SZ201-N").includes("中间滚筒"), false);
});

test("single-point belt equipment uses its dedicated field key", () => {
  assert.deepEqual(
    getBeltPoints("SZ101", ["东", "西"], "电机 / 减速机"),
    [
      {
        label: "电机",
        key: fieldKey("belt", "SZ101", "电机 / 减速机", "motor"),
      },
    ],
  );
  assert.deepEqual(
    getBeltPoints("SZ201-N", ["南", "北"], "液力耦合器"),
    [
      {
        label: "液耦",
        key: fieldKey("belt", "SZ201-N", "液力耦合器", "fluid"),
      },
    ],
  );
});
