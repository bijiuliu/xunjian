import { BELT_ITEMS, BELTS, PUMP_READING_FIELDS } from "./config";
import type { BeltId, InspectionValues, PumpAreaId } from "./types";

export const fieldKey = (...parts: string[]) => parts.join("__");

export const isBeltId = (value: unknown): value is BeltId =>
  BELTS.some(({ id }) => id === value);

export const getVisibleBeltItems = (id: BeltId) =>
  BELT_ITEMS.filter(
    (item) =>
      !(
        (["SZ101", "SZ201"] as BeltId[]).includes(id) &&
        item === "液力耦合器"
      ) &&
      !(id === "SZ201" && item === "头增面轮") &&
      !(id === "SZ201-N" && item === "中间滚筒") &&
      !(
        id === "SZ101" &&
        (["配重东 / 南", "配重西 / 北", "配重", "中间滚筒"] as string[]).includes(
          item,
        )
      ),
  );

export const getBeltItemTitle = (id: BeltId, item: string) =>
  id === "SZ101" && item === "电机 / 减速机" ? "电机" : item;

export const getBeltPoints = (
  id: BeltId,
  ends: readonly string[],
  item: string,
) => {
  if (id === "SZ101" && item === "电机 / 减速机") {
    return [{ label: "电机", key: fieldKey("belt", id, item, "motor") }];
  }
  if (id === "SZ201-N" && item === "液力耦合器") {
    return [{ label: "液耦", key: fieldKey("belt", id, item, "fluid") }];
  }
  const labels =
    item === "电机 / 减速机"
      ? ["电机", "减速机"]
      : item === "配重东 / 南"
        ? ["东", "南"]
        : item === "配重西 / 北"
          ? ["西", "北"]
          : ends;

  return ends.map((end, index) => ({
    label: labels[index],
    key: fieldKey("belt", id, item, end),
  }));
};

export const getPumpCardKeys = (
  area: PumpAreaId,
  group: string,
  index: number,
) =>
  ["no", ...PUMP_READING_FIELDS.map(([, field]) => field)].map((field) =>
    fieldKey(area, group, String(index), field),
  );

export const getBeltItemKeys = (
  id: BeltId,
  ends: readonly string[],
  item: string,
) => getBeltPoints(id, ends, item).map(({ key }) => key);

export const selectPump = (
  values: InspectionValues,
  area: PumpAreaId,
  group: string,
  index: number,
  pumpNo: string,
) => {
  const currentKey = fieldKey(area, group, String(index), "no");
  const otherKey = fieldKey(area, group, String(1 - index), "no");
  const currentPump = values[currentKey] || "";
  const otherPump = values[otherKey] || "";

  if (pumpNo && pumpNo === otherPump) {
    return { ...values, [currentKey]: pumpNo, [otherKey]: currentPump };
  }
  return { ...values, [currentKey]: pumpNo };
};
