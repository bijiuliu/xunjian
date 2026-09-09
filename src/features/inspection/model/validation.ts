import { BELTS, PUMP_AREAS, PUMP_READING_FIELDS } from "./config";
import {
  fieldKey,
  getBeltItemTitle,
  getBeltPoints,
  getVisibleBeltItems,
} from "./field-rules";
import type {
  InspectionRecord,
  InspectionValues,
  PumpAreaId,
  SaveValidation,
} from "./types";

export function isInspectionValues(value: unknown): value is InspectionValues {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((fieldValue) => typeof fieldValue === "string")
  );
}

export function isInspectionRecord(value: unknown): value is InspectionRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<InspectionRecord>;

  return (
    typeof record.id === "string" &&
    record.id.trim().length > 0 &&
    typeof record.date === "string" &&
    record.date.trim().length > 0 &&
    typeof record.time === "string" &&
    record.time.trim().length > 0 &&
    (!("createdAt" in record) ||
      (typeof record.createdAt === "string" &&
        !Number.isNaN(Date.parse(record.createdAt)))) &&
    isInspectionValues(record.values)
  );
}

export function validateInspection(values: InspectionValues): SaveValidation {
  const unselectedPumps: string[] = [];
  const emptyInputs: string[] = [];

  (["slag8", "slag9"] as const satisfies readonly PumpAreaId[]).forEach(
    (area) => {
      PUMP_AREAS[area].groups.forEach(([group]) => {
        [0, 1].forEach((index) => {
          const device = `${PUMP_AREAS[area].title} · ${group} · 设备${index + 1}`;
          if (!values[fieldKey(area, group, String(index), "no")]) {
            unselectedPumps.push(device);
          }
          PUMP_READING_FIELDS.forEach(([label, field]) => {
            if (!values[fieldKey(area, group, String(index), field)]) {
              emptyInputs.push(`${device} · ${label}`);
            }
          });
        });
      });
    },
  );

  BELTS.forEach((belt) => {
    getVisibleBeltItems(belt.id).forEach((item) => {
      getBeltPoints(belt.id, belt.ends, item).forEach(({ label, key }) => {
        if (!values[key]) {
          emptyInputs.push(
            `皮带区域 · ${belt.id} · ${getBeltItemTitle(belt.id, item)} · ${label}`,
          );
        }
      });
    });
  });

  return { unselectedPumps, emptyInputs };
}
