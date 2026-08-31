import type { InspectionRecord } from "./types";

const LEGACY_LOCAL_DATE_TIME =
  /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/;

export function getInspectionRecordCreatedAt(
  record: Pick<InspectionRecord, "createdAt" | "time">,
) {
  const explicitTimestamp = parseTimestamp(record.createdAt);
  if (explicitTimestamp !== null) return new Date(explicitTimestamp).toISOString();

  const legacyMatch = LEGACY_LOCAL_DATE_TIME.exec(record.time.trim());
  if (legacyMatch) {
    const [, year, month, day, hour, minute, second = "0"] = legacyMatch;
    const timestamp = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ).getTime();
    if (!Number.isNaN(timestamp)) return new Date(timestamp).toISOString();
  }

  const fallbackTimestamp = parseTimestamp(record.time);
  return fallbackTimestamp === null
    ? null
    : new Date(fallbackTimestamp).toISOString();
}

export function getInspectionRecordTimestamp(
  record: Pick<InspectionRecord, "createdAt" | "time">,
) {
  const createdAt = getInspectionRecordCreatedAt(record);
  return createdAt ? Date.parse(createdAt) : Number.NaN;
}

function parseTimestamp(value: string | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}
