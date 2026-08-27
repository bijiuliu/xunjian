import { isBeltId } from "../model/field-rules";
import type {
  BeltId,
  InspectionDraft,
  InspectionRecord,
  InspectionValues,
} from "../model/types";

export const RECORDS_STORAGE_KEY = "night-inspection";
export const DRAFT_STORAGE_KEY = "night-inspection-draft";

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
      records = storedRecords as InspectionRecord[];
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
