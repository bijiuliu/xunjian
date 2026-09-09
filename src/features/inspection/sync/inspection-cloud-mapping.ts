import { isBeltId } from "../model/field-rules";
import { getInspectionRecordCreatedAt } from "../model/record-time";
import type { BeltId, InspectionRecord, InspectionValues } from "../model/types";
import { isInspectionValues } from "../model/validation";

export type CloudInspectionRecord = {
  id: string;
  user_id: string;
  inspection_date: string;
  inspection_time: string;
  recorded_at: string | null;
  values: InspectionValues;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CloudInspectionDraft = {
  user_id: string;
  values: InspectionValues;
  belt_tab: BeltId;
  updated_at: string;
};

/** Business fields only; each write operation supplies its own conflict policy. */
export function toCloudRecord(record: InspectionRecord) {
  return {
    id: record.id,
    inspection_date: record.date,
    inspection_time: record.time,
    recorded_at: getInspectionRecordCreatedAt(record),
    values: record.values,
  };
}

export function fromCloudRecord(row: CloudInspectionRecord): InspectionRecord {
  return {
    id: row.id,
    date: row.inspection_date,
    time: row.inspection_time,
    createdAt:
      row.recorded_at ??
      getInspectionRecordCreatedAt({ time: row.inspection_time }) ??
      row.created_at,
    values: row.values,
  };
}

export function isCloudRecord(value: unknown): value is CloudInspectionRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CloudInspectionRecord>;
  return (
    typeof row.id === "string" &&
    typeof row.user_id === "string" &&
    typeof row.inspection_date === "string" &&
    typeof row.inspection_time === "string" &&
    (row.recorded_at === null || typeof row.recorded_at === "string") &&
    isInspectionValues(row.values) &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string" &&
    (row.deleted_at === null || typeof row.deleted_at === "string")
  );
}

export function isCloudDraft(value: unknown): value is CloudInspectionDraft {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CloudInspectionDraft>;
  return (
    typeof row.user_id === "string" &&
    isInspectionValues(row.values) &&
    isBeltId(row.belt_tab) &&
    typeof row.updated_at === "string"
  );
}
