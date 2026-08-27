"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getBeltItemKeys,
  getPumpCardKeys,
  selectPump,
} from "../model/field-rules";
import type {
  BeltId,
  DeleteRequest,
  InspectionRecord,
  InspectionTab,
  InspectionValues,
  PumpAreaId,
  SaveValidation,
} from "../model/types";
import { validateInspection } from "../model/validation";
import {
  clearInspectionDraft,
  loadInspectionState,
  saveInspectionDraft,
  saveInspectionRecords,
} from "../storage/inspection-storage";

export function useInspectionController() {
  const [tab, setTab] = useState<InspectionTab>("slag8");
  const [beltTab, setBeltTab] = useState<BeltId>("SZ101");
  const [values, setValues] = useState<InspectionValues>({});
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] =
    useState<InspectionRecord | null>(null);
  const [historyDirection, setHistoryDirection] = useState<1 | -1>(1);
  const [manageHistory, setManageHistory] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [saveValidation, setSaveValidation] =
    useState<SaveValidation | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const loadStorage = window.setTimeout(() => {
      const stored = loadInspectionState();
      setRecords(stored.records);
      setValues(stored.values);
      setBeltTab(stored.beltTab);
      setDraftReady(true);
    }, 0);

    return () => window.clearTimeout(loadStorage);
  }, []);

  useEffect(() => {
    if (draftReady) saveInspectionDraft({ values, beltTab });
  }, [beltTab, draftReady, values]);

  const updateValue = (fieldKey: string, value: string) => {
    setValues((current) => ({ ...current, [fieldKey]: value }));
  };

  const clearKeys = (keys: string[]) => {
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(keys.map((key) => [key, ""])),
    }));
  };

  const clearPump = (area: PumpAreaId, group: string, index: number) => {
    clearKeys(getPumpCardKeys(area, group, index));
    toast.success(`已清空${area === "slag8" ? "8#" : "9#"}${group}`);
  };

  const choosePump = (
    area: PumpAreaId,
    group: string,
    index: number,
    pumpNo: string,
  ) => {
    setValues((current) => selectPump(current, area, group, index, pumpNo));
  };

  const clearBeltItem = (
    id: BeltId,
    ends: readonly string[],
    item: string,
  ) => {
    clearKeys(getBeltItemKeys(id, ends, item));
    const itemTitle =
      id === "SZ101" && item === "电机 / 减速机" ? "电机" : item;
    toast.success(`已清空${id} ${itemTitle}`);
  };

  const selectTab = (nextTab: InspectionTab) => {
    setTab(nextTab);
    if (nextTab === "history") {
      setHistoryDirection(-1);
      setSelectedRecord(null);
      setManageHistory(false);
      setSelectedRecordIds([]);
    }
  };

  const createNewInspection = () => {
    setValues({});
    setBeltTab("SZ101");
    clearInspectionDraft();
    toast("已新建空白记录");
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
    saveInspectionRecords(next);
    setRecords(next);
    if (selectedRecord && deleting.has(selectedRecord.id)) {
      setHistoryDirection(-1);
      setSelectedRecord(null);
    }
    setSelectedRecordIds([]);
    setManageHistory(false);
    setDeleteRequest(null);
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
      values,
    };
    const next = [record, ...records];
    saveInspectionRecords(next);
    setRecords(next);
    setSelectedRecord(null);
    setManageHistory(false);
    setSelectedRecordIds([]);
    setSaveValidation(null);
    setTab("history");
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
      tab,
      beltTab,
      values,
      records,
      selectedRecord,
      historyDirection,
      manageHistory,
      selectedRecordIds,
      deleteRequest,
      saveValidation,
    },
    actions: {
      updateValue,
      clearPump,
      choosePump,
      clearBeltItem,
      setBeltTab,
      selectTab,
      createNewInspection,
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
