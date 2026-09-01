import { isBeltId } from "../model/field-rules";
import type {
  BeltId,
  InspectionDraft,
  InspectionRecord,
  InspectionValues,
} from "../model/types";
import { normalizeInspectionRecord } from "./inspection-backup";

export const RECORDS_STORAGE_KEY = "night-inspection";
export const DRAFT_STORAGE_KEY = "night-inspection-draft";
export const LAST_BACKUP_STORAGE_KEY = "night-inspection-last-backup";
export const IMPORT_UNDO_STORAGE_KEY = "night-inspection-import-undo";
export const STORAGE_OWNER_KEY = "night-inspection-owner";

const ACCOUNT_CACHE_PREFIX = "night-inspection-account:";
const IMPORT_UNDO_TTL_MS = 5 * 60 * 1000;

export type ImportUndoSnapshot = {
  records: InspectionRecord[];
  expiresAt: number;
};

export type StoredInspectionState = {
  records: InspectionRecord[];
  values: InspectionValues;
  beltTab: BeltId;
  draftUpdatedAt: string | null;
  hasDraft: boolean;
};

export function loadInspectionState(): StoredInspectionState {
  let records: InspectionRecord[] = [];
  let values: InspectionValues = {};
  let beltTab: BeltId = "SZ101";
  let draftUpdatedAt: string | null = null;
  let hasDraft = false;

  try {
    const storedRecords = JSON.parse(
      localStorage.getItem(RECORDS_STORAGE_KEY) || "[]",
    ) as unknown;
    if (Array.isArray(storedRecords)) {
      records = storedRecords
        .map(normalizeInspectionRecord)
        .filter((record): record is InspectionRecord => record !== null);
    }
  } catch {
    records = [];
  }

  try {
    const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (storedDraft) {
      hasDraft = true;
      const draft = JSON.parse(storedDraft) as unknown;
      if (draft && typeof draft === "object" && "values" in draft) {
        const savedDraft = draft as Partial<InspectionDraft>;
        if (savedDraft.values) values = savedDraft.values;
        if (isBeltId(savedDraft.beltTab)) beltTab = savedDraft.beltTab;
        if (
          typeof savedDraft.updatedAt === "string" &&
          !Number.isNaN(Date.parse(savedDraft.updatedAt))
        ) {
          draftUpdatedAt = savedDraft.updatedAt;
        }
      } else if (draft && typeof draft === "object") {
        values = draft as InspectionValues;
      }
    }
  } catch {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    hasDraft = false;
  }

  return { records, values, beltTab, draftUpdatedAt, hasDraft };
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

export function saveImportUndo(records: InspectionRecord[]): ImportUndoSnapshot {
  const savedAt = new Date().toISOString();
  const expiresAt = Date.parse(savedAt) + IMPORT_UNDO_TTL_MS;
  localStorage.setItem(
    IMPORT_UNDO_STORAGE_KEY,
    JSON.stringify({ savedAt, expiresAt: new Date(expiresAt).toISOString(), records }),
  );
  return { records, expiresAt };
}

export function loadImportUndo(): ImportUndoSnapshot | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(IMPORT_UNDO_STORAGE_KEY) || "null",
    ) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "savedAt" in parsed &&
      typeof parsed.savedAt === "string" &&
      "records" in parsed &&
      Array.isArray(parsed.records)
    ) {
      const savedAt = Date.parse(parsed.savedAt);
      const storedExpiresAt =
        "expiresAt" in parsed && typeof parsed.expiresAt === "string"
          ? Date.parse(parsed.expiresAt)
          : Number.NaN;
      const expiresAt = Number.isNaN(storedExpiresAt)
        ? savedAt + IMPORT_UNDO_TTL_MS
        : storedExpiresAt;

      if (Number.isNaN(savedAt) || expiresAt <= Date.now()) {
        clearImportUndo();
        return null;
      }

      return {
        records: parsed.records
          .map(normalizeInspectionRecord)
          .filter((record): record is InspectionRecord => record !== null),
        expiresAt,
      };
    }
  } catch {
    clearImportUndo();
  }
  return null;
}

export function clearImportUndo() {
  localStorage.removeItem(IMPORT_UNDO_STORAGE_KEY);
}

export function prepareStorageForUser(userId: string): StoredInspectionState {
  const currentOwner = localStorage.getItem(STORAGE_OWNER_KEY);

  if (!currentOwner) {
    localStorage.setItem(STORAGE_OWNER_KEY, userId);
    const legacyState = loadInspectionState();
    saveAccountCache(userId, legacyState);
    return legacyState;
  }

  if (currentOwner === userId) return loadInspectionState();

  saveAccountCache(currentOwner, loadInspectionState());
  const nextState = loadAccountCache(userId) ?? emptyInspectionState();
  localStorage.removeItem(IMPORT_UNDO_STORAGE_KEY);
  localStorage.removeItem(LAST_BACKUP_STORAGE_KEY);
  saveInspectionRecords(nextState.records);
  if (nextState.hasDraft) {
    saveInspectionDraft({
      values: nextState.values,
      beltTab: nextState.beltTab,
      ...(nextState.draftUpdatedAt
        ? { updatedAt: nextState.draftUpdatedAt }
        : {}),
    });
  } else {
    clearInspectionDraft();
  }
  localStorage.setItem(STORAGE_OWNER_KEY, userId);
  return nextState;
}

export function saveCurrentAccountCache(userId: string) {
  if (localStorage.getItem(STORAGE_OWNER_KEY) !== userId) return;
  saveAccountCache(userId, loadInspectionState());
}

function saveAccountCache(userId: string, state: StoredInspectionState) {
  localStorage.setItem(`${ACCOUNT_CACHE_PREFIX}${userId}`, JSON.stringify(state));
}

function loadAccountCache(userId: string): StoredInspectionState | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(`${ACCOUNT_CACHE_PREFIX}${userId}`) || "null",
    ) as Partial<StoredInspectionState> | null;
    if (!parsed || !Array.isArray(parsed.records)) return null;

    const values =
      parsed.values && typeof parsed.values === "object" ? parsed.values : {};
    const draftUpdatedAt =
      typeof parsed.draftUpdatedAt === "string" ? parsed.draftUpdatedAt : null;

    return {
      records: parsed.records
        .map(normalizeInspectionRecord)
        .filter((record): record is InspectionRecord => record !== null),
      values,
      beltTab: isBeltId(parsed.beltTab) ? parsed.beltTab : "SZ101",
      draftUpdatedAt,
      hasDraft:
        typeof parsed.hasDraft === "boolean"
          ? parsed.hasDraft
          : draftUpdatedAt !== null || Object.keys(values).length > 0,
    };
  } catch {
    return null;
  }
}

function emptyInspectionState(): StoredInspectionState {
  return {
    records: [],
    values: {},
    beltTab: "SZ101",
    draftUpdatedAt: null,
    hasDraft: false,
  };
}
