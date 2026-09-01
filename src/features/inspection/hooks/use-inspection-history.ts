import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type {
  DeleteRequest,
  InspectionRecord,
  InspectionValues,
  SaveValidation,
} from "../model/types";
import { validateInspection } from "../model/validation";
import {
  deleteCloudInspectionRecords,
  pushInspectionRecord,
} from "../sync/inspection-cloud-sync";

type UseInspectionHistoryOptions = {
  userId?: string;
  records: InspectionRecord[];
  values: InspectionValues;
  setRecords: Dispatch<SetStateAction<InspectionRecord[]>>;
  persistRecords: (records: InspectionRecord[]) => void;
  runCloudChange: (operation: Promise<void>) => Promise<void>;
  showHistory: () => void;
};

export function useInspectionHistory({
  userId,
  records,
  values,
  setRecords,
  persistRecords,
  runCloudChange,
  showHistory,
}: UseInspectionHistoryOptions) {
  const [selectedRecord, setSelectedRecord] =
    useState<InspectionRecord | null>(null);
  const [historyDirection, setHistoryDirection] = useState<1 | -1>(1);
  const [manageHistory, setManageHistory] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [saveValidation, setSaveValidation] =
    useState<SaveValidation | null>(null);

  const resetHistoryList = () => {
    setHistoryDirection(-1);
    setSelectedRecord(null);
    setManageHistory(false);
    setSelectedRecordIds([]);
  };

  const resetAfterRecordsChanged = () => {
    setSelectedRecord(null);
    setManageHistory(false);
    setSelectedRecordIds([]);
  };

  const selectRecord = (record: InspectionRecord) => {
    setHistoryDirection(1);
    setSelectedRecord(record);
  };

  const returnToHistoryList = () => {
    setHistoryDirection(-1);
    setSelectedRecord(null);
  };

  const toggleHistoryManagement = () => {
    setManageHistory((current) => !current);
    setSelectedRecordIds([]);
  };

  const toggleRecord = (id: string) => {
    setSelectedRecordIds((current) =>
      current.includes(id)
        ? current.filter((recordId) => recordId !== id)
        : [...current, id],
    );
  };

  const confirmDeleteRecords = () => {
    if (!deleteRequest) return;
    const deleting = new Set(deleteRequest.ids);
    const next = records.filter((record) => !deleting.has(record.id));
    persistRecords(next);
    setRecords(next);
    if (selectedRecord && deleting.has(selectedRecord.id)) {
      setHistoryDirection(-1);
      setSelectedRecord(null);
    }
    setSelectedRecordIds([]);
    setManageHistory(false);
    setDeleteRequest(null);
    if (userId) {
      void runCloudChange(
        deleteCloudInspectionRecords(userId, deleteRequest.ids),
      );
    }
    toast.success(
      deleteRequest.ids.length > 1
        ? `已删除 ${deleteRequest.ids.length} 条记录`
        : "已删除历史记录",
    );
  };

  const commitSave = () => {
    const now = new Date();
    const record: InspectionRecord = {
      id: crypto.randomUUID(),
      date: now.toLocaleDateString("zh-CN"),
      time: now.toLocaleString("zh-CN"),
      createdAt: now.toISOString(),
      values,
    };
    const next = [record, ...records];
    persistRecords(next);
    setRecords(next);
    resetAfterRecordsChanged();
    setSaveValidation(null);
    showHistory();
    if (userId) {
      void runCloudChange(pushInspectionRecord(userId, record));
    }
    toast.success("本次巡检已保存");
  };

  const save = () => {
    const missing = validateInspection(values);
    if (missing.unselectedPumps.length || missing.emptyInputs.length) {
      setSaveValidation(missing);
      return;
    }
    commitSave();
  };

  return {
    state: {
      selectedRecord,
      historyDirection,
      manageHistory,
      selectedRecordIds,
      deleteRequest,
      saveValidation,
    },
    actions: {
      resetHistoryList,
      resetAfterRecordsChanged,
      selectRecord,
      returnToHistoryList,
      toggleHistoryManagement,
      toggleRecord,
      setDeleteRequest,
      confirmDeleteRecords,
      commitSave,
      save,
      cancelSaveValidation: () => setSaveValidation(null),
      cancelDeleteRequest: () => setDeleteRequest(null),
    },
  };
}
