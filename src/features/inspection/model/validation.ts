import { BELTS, PUMP_AREAS, PUMP_READING_FIELDS } from "./config";
import {
  fieldKey,
  getBeltItemTitle,
  getBeltPoints,
  getVisibleBeltItems,
} from "./field-rules";
import type { InspectionValues, PumpAreaId, SaveValidation } from "./types";

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
