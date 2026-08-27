export type InspectionTab = "slag8" | "belt" | "slag9" | "history";

export type PumpAreaId = "slag8" | "slag9";

export type BeltId = "SZ101" | "SZ201" | "SZ201-N";

export type InspectionValues = Record<string, string>;

export type InspectionRecord = {
  id: string;
  date: string;
  time: string;
  values: InspectionValues;
};

export type InspectionDraft = {
  values: InspectionValues;
  beltTab: BeltId;
};

export type SaveValidation = {
  unselectedPumps: string[];
  emptyInputs: string[];
};

export type DeleteRequest = {
  ids: string[];
  label: string;
};
