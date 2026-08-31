export type InspectionTab = "slag8" | "belt" | "slag9" | "history";

export type PumpAreaId = "slag8" | "slag9";

export type BeltId = "SZ101" | "SZ201" | "SZ201-N";

export type InspectionValues = Record<string, string>;

export type InspectionRecord = {
  id: string;
  date: string;
  time: string;
  /** ISO 8601 timestamp. Optional only while reading legacy records. */
  createdAt?: string;
  values: InspectionValues;
};

export type InspectionDraft = {
  values: InspectionValues;
  beltTab: BeltId;
  updatedAt?: string;
};

export type SaveValidation = {
  unselectedPumps: string[];
  emptyInputs: string[];
};

export type DeleteRequest = {
  ids: string[];
  label: string;
};

export type InspectionImportPreview = {
  fileName: string;
  exportedAt: string | null;
  records: InspectionRecord[];
  newRecordCount: number;
  duplicateCount: number;
  invalidCount: number;
};
