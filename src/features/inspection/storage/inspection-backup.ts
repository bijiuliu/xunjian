import type {
  InspectionImportPreview,
  InspectionRecord,
  InspectionValues,
} from "../model/types";

const BACKUP_APP_ID = "night-inspection";
const BACKUP_SCHEMA_VERSION = 1;

type InspectionBackup = {
  app: typeof BACKUP_APP_ID;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  records: InspectionRecord[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInspectionValues(value: unknown): value is InspectionValues {
  return (
    isRecord(value) &&
    Object.values(value).every((fieldValue) => typeof fieldValue === "string")
  );
}

export function isInspectionRecord(value: unknown): value is InspectionRecord {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.date === "string" &&
    value.date.trim().length > 0 &&
    typeof value.time === "string" &&
    value.time.trim().length > 0 &&
    isInspectionValues(value.values)
  );
}

export function createInspectionBackup(records: InspectionRecord[]) {
  const backup: InspectionBackup = {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records,
  };

  return JSON.stringify(backup, null, 2);
}

export function createBackupFileName(now = new Date()) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `夜班巡检备份_${value("year")}-${value("month")}-${value("day")}_${value("hour")}${value("minute")}.json`;
}

export function parseInspectionBackup(
  text: string,
  fileName: string,
  currentRecords: InspectionRecord[],
): InspectionImportPreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("文件不是有效的 JSON 备份");
  }

  // Accept the app's versioned format and legacy raw arrays for compatibility.
  const rawRecords = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) &&
        parsed.app === BACKUP_APP_ID &&
        parsed.schemaVersion === BACKUP_SCHEMA_VERSION &&
        Array.isArray(parsed.records)
      ? parsed.records
      : null;

  if (!rawRecords) {
    throw new Error("这不是“夜班巡检”支持的备份文件");
  }

  const existingIds = new Set(currentRecords.map((record) => record.id));
  const fileIds = new Set<string>();
  const records: InspectionRecord[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;
  let newRecordCount = 0;

  for (const item of rawRecords) {
    if (!isInspectionRecord(item)) {
      invalidCount += 1;
      continue;
    }
    if (fileIds.has(item.id)) {
      duplicateCount += 1;
      continue;
    }

    fileIds.add(item.id);
    records.push(item);
    if (existingIds.has(item.id)) duplicateCount += 1;
    else newRecordCount += 1;
  }

  const exportedAt =
    !Array.isArray(parsed) &&
    isRecord(parsed) &&
    typeof parsed.exportedAt === "string" &&
    !Number.isNaN(Date.parse(parsed.exportedAt))
      ? parsed.exportedAt
      : null;

  return {
    fileName,
    exportedAt,
    records,
    newRecordCount,
    duplicateCount,
    invalidCount,
  };
}

export function mergeInspectionRecords(
  currentRecords: InspectionRecord[],
  importedRecords: InspectionRecord[],
) {
  const existingIds = new Set(currentRecords.map((record) => record.id));
  const additions = importedRecords.filter((record) => !existingIds.has(record.id));
  return sortInspectionRecords([...currentRecords, ...additions]);
}

export function sortInspectionRecords(records: InspectionRecord[]) {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left.time);
    const rightTime = Date.parse(right.time);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
    return rightTime - leftTime;
  });
}
