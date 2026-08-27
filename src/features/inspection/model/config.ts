import type { BeltId, InspectionTab, PumpAreaId } from "./types";

export const PUMP_AREAS = {
  slag8: {
    title: "8#冲渣区域",
    groups: [
      ["冲渣泵", ["101", "102", "103"]],
      ["上塔泵", ["501", "502", "503"]],
    ],
  },
  slag9: {
    title: "9#冲渣区域",
    groups: [
      ["冲渣泵", ["201", "202", "203"]],
      ["上塔泵", ["1#", "2#", "3#"]],
    ],
  },
} as const satisfies Record<
  PumpAreaId,
  { title: string; groups: readonly (readonly [string, readonly string[]])[] }
>;

export const BELTS = [
  { id: "SZ101", ends: ["东", "西"] },
  { id: "SZ201", ends: ["南", "北"] },
  { id: "SZ201-N", ends: ["南", "北"] },
] as const satisfies readonly { id: BeltId; ends: readonly [string, string] }[];

export const BELT_ITEMS = [
  "电机 / 减速机",
  "液力耦合器",
  "头轮",
  "头增面轮",
  "配重东 / 南",
  "配重西 / 北",
  "配重",
  "中间滚筒",
  "尾轮",
] as const;

export const INSPECTION_TABS = [
  ["slag8", "8#冲渣"],
  ["belt", "皮带"],
  ["slag9", "9#冲渣"],
  ["history", "历史记录"],
] as const satisfies readonly (readonly [InspectionTab, string])[];

export const PUMP_READING_FIELDS = [
  ["南", "south"],
  ["北", "north"],
  ["前轴", "front"],
  ["机身", "body"],
] as const;
