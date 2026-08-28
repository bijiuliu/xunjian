import { isBeltId } from "../model/field-rules";
import type {
  BeltId,
  InspectionDraft,
  InspectionRecord,
  InspectionValues,
} from "../model/types";
import { isInspectionRecord } from "./inspection-backup";

export const RECORDS_STORAGE_KEY = "night-inspection";
export const DRAFT_STORAGE_KEY = "night-inspection-draft";
export const LAST_BACKUP_STORAGE_KEY = "night-inspection-last-backup";
export const IMPORT_UNDO_STORAGE_KEY = "night-inspection-import-undo";

export type StoredInspectionState = {
  records: InspectionRecord[];
  values: InspectionValues;
  beltTab: BeltId;
};

export function loadInspectionState(): StoredInspectionState {
  let records: InspectionRecord[] = [];
  let values: InspectionValues = {};
  let beltTab: BeltId = "SZ101";

  try {
    const storedRecords = JSON.parse(
      localStorage.getItem(RECORDS_STORAGE_KEY) || "[]",
    ) as unknown;
    if (Array.isArray(storedRecords)) {
      records = storedRecords.filter(isInspectionRecord);
    }
  } catch {
    records = [];
  }

  try {
    const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (storedDraft) {
      const draft = JSON.parse(storedDraft) as unknown;
      if (draft && typeof draft === "object" && "values" in draft) {
        const savedDraft = draft as Partial<InspectionDraft>;
        if (savedDraft.values) values = savedDraft.values;
        if (isBeltId(savedDraft.beltTab)) beltTab = savedDraft.beltTab;
      } else if (draft && typeof draft === "object") {
        values = draft as InspectionValues;
      }
    }
  } catch {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  return { records, values, beltTab };
}

export function saveInspectionRecords(records: InspectionRecord[]) {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

export function saveInspectionDraft(draft: InspectionDraft) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearInspectionDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function loadLastBackupAt() {
  return localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
}

export function saveLastBackupAt(value: string) {
  localStorage.setItem(LAST_BACKUP_STORAGE_KEY, value);
}

export function saveImportUndo(records: InspectionRecord[]) {
  localStorage.setItem(
    IMPORT_UNDO_STORAGE_KEY,
    JSON.stringify({ savedAt: new Date().toISOString(), records }),
  );
}

export function loadImportUndo(): InspectionRecord[] | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(IMPORT_UNDO_STORAGE_KEY) || "null",
    ) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "records" in parsed &&
      Array.isArray(parsed.records)
    ) {
      return parsed.records.filter(isInspectionRecord);
    }
  } catch {
    localStorage.removeItem(IMPORT_UNDO_STORAGE_KEY);
  }
  return null;
}

export function clearImportUndo() {
  localStorage.removeItem(IMPORT_UNDO_STORAGE_KEY);
}
