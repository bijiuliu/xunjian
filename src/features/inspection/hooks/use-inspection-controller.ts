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
  InspectionImportPreview,
  InspectionRecord,
  InspectionTab,
  InspectionValues,
  PumpAreaId,
  SaveValidation,
} from "../model/types";
import { validateInspection } from "../model/validation";
import {
  createBackupFileName,
  createInspectionBackup,
  mergeInspectionRecords,
  parseInspectionBackup,
  sortInspectionRecords,
} from "../storage/inspection-backup";
import {
  clearImportUndo,
  clearInspectionDraft,
  loadImportUndo,
  loadInspectionState,
  loadLastBackupAt,
  saveImportUndo,
  saveInspectionDraft,
  saveLastBackupAt,
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
  const [backupOpen, setBackupOpen] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [importPreview, setImportPreview] =
    useState<InspectionImportPreview | null>(null);
  const [canUndoImport, setCanUndoImport] = useState(false);

  useEffect(() => {
    const loadStorage = window.setTimeout(() => {
      const stored = loadInspectionState();
      setRecords(stored.records);
      setValues(stored.values);
      setBeltTab(stored.beltTab);
      setLastBackupAt(loadLastBackupAt());
      setCanUndoImport(Boolean(loadImportUndo()));
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

  const closeBackup = () => {
    setBackupOpen(false);
    setImportPreview(null);
  };

  const exportBackup = async () => {
    if (records.length === 0) {
      toast.error("暂无可导出的历史记录");
      return;
    }

    const content = createInspectionBackup(records);
    const fileName = createBackupFileName();
    const file = new File([content], fileName, { type: "application/json" });
    let delivery: "share" | "download" = "download";

    try {
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "夜班巡检备份",
            text: `共 ${records.length} 条历史记录`,
          });
          delivery = "share";
        } catch (error) {
          if (isAbortError(error)) return;
          downloadBackupFile(file, fileName);
        }
      } else {
        downloadBackupFile(file, fileName);
      }

      const exportedAt = new Date().toISOString();
      try {
        saveLastBackupAt(exportedAt);
      } catch {
        // The backup is already delivered; a timestamp failure should not
        // turn a successful export into an error for the user.
      }
      setLastBackupAt(exportedAt);
      toast.success(
        delivery === "share"
          ? `已分享 ${records.length} 条历史记录`
          : `已下载 ${records.length} 条历史记录的备份`,
      );
    } catch {
      toast.error("备份失败，请稍后重试");
    }
  };

  const previewImportFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("备份文件过大，请选择 10MB 以内的文件");
      return;
    }

    try {
      const text = await file.text();
      setImportPreview(parseInspectionBackup(text, file.name, records));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法读取备份文件");
    }
  };

  const undoImport = () => {
    const previousRecords = loadImportUndo();
    if (!previousRecords) {
      setCanUndoImport(false);
      toast.error("可撤销的恢复数据已不存在");
      return;
    }

    try {
      saveInspectionRecords(previousRecords);
      setRecords(previousRecords);
      clearImportUndo();
      setCanUndoImport(false);
      setSelectedRecord(null);
      setManageHistory(false);
      setSelectedRecordIds([]);
      toast.success("已撤销上次恢复");
    } catch {
      toast.error("撤销失败，原备份仍已保留");
    }
  };

  const applyImport = (mode: "merge" | "replace") => {
    if (!importPreview) return;
    if (mode === "merge" && importPreview.newRecordCount === 0) {
      toast("没有需要新增的记录");
      return;
    }
    if (mode === "replace" && importPreview.invalidCount > 0) {
      toast.error("备份含无效记录，不能用于覆盖恢复");
      return;
    }

    const next =
      mode === "merge"
        ? mergeInspectionRecords(records, importPreview.records)
        : sortInspectionRecords(importPreview.records);

    try {
      saveImportUndo(records);
      saveInspectionRecords(next);
      setRecords(next);
      setCanUndoImport(true);
      setSelectedRecord(null);
      setManageHistory(false);
      setSelectedRecordIds([]);
      closeBackup();
      toast.success(
        mode === "merge"
          ? `已恢复 ${importPreview.newRecordCount} 条历史记录`
          : `已替换为 ${next.length} 条历史记录`,
        { action: { label: "撤销", onClick: undoImport } },
      );
    } catch {
      toast.error("恢复失败，当前记录未更改");
    }
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
      backupOpen,
      lastBackupAt,
      importPreview,
      canUndoImport,
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
      openBackup: () => setBackupOpen(true),
      closeBackup,
      exportBackup,
      previewImportFile,
      cancelImportPreview: () => setImportPreview(null),
      mergeImport: () => applyImport("merge"),
      replaceImport: () => applyImport("replace"),
      undoImport,
    },
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function downloadBackupFile(file: File, fileName: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
