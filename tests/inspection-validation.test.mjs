import assert from "node:assert/strict";
import test from "node:test";

import {
  BELTS,
  PUMP_AREAS,
  PUMP_READING_FIELDS,
} from "../src/features/inspection/model/config.ts";
import {
  fieldKey,
  getBeltPoints,
  getVisibleBeltItems,
} from "../src/features/inspection/model/field-rules.ts";
import { validateInspection } from "../src/features/inspection/model/validation.ts";

function createCompleteValues() {
  const values = {};
  for (const area of ["slag8", "slag9"]) {
    for (const [group, pumpNumbers] of PUMP_AREAS[area].groups) {
      for (const index of [0, 1]) {
        values[fieldKey(area, group, String(index), "no")] = pumpNumbers[index];
        for (const [, field] of PUMP_READING_FIELDS) {
          values[fieldKey(area, group, String(index), field)] = "1";
        }
      }
    }
  }
  for (const belt of BELTS) {
    for (const item of getVisibleBeltItems(belt.id)) {
      for (const point of getBeltPoints(belt.id, belt.ends, item)) {
        values[point.key] = "1";
      }
    }
  }
  return values;
}

test("a complete inspection has no validation warnings", () => {
  assert.deepEqual(validateInspection(createCompleteValues()), {
    unselectedPumps: [],
    emptyInputs: [],
  });
});

test("validation separates missing pump choices from empty readings", () => {
  const values = createCompleteValues();
  delete values[fieldKey("slag8", "冲渣泵", "0", "no")];
  delete values[fieldKey("belt", "SZ101", "电机 / 减速机", "motor")];

  const result = validateInspection(values);
  assert.deepEqual(result.unselectedPumps, ["8#冲渣区域 · 冲渣泵 · 设备1"]);
  assert.deepEqual(result.emptyInputs, [
    "皮带区域 · SZ101 · 电机 · 电机",
  ]);
});
