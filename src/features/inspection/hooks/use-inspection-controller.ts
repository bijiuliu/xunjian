"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  deleteCloudInspectionRecords,
  pushInspectionDraft,
  pushInspectionRecord,
  replaceCloudInspectionRecords,
  syncInspectionAccount,
} from "../sync/inspection-cloud-sync";
import { prepareStorageForUser, saveCurrentAccountCache } from "../storage/inspection-storage";

export type InspectionSyncStatus =
  | "local"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

export function useInspectionController(userId?: string) {
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
  const [importUndoExpiresAt, setImportUndoExpiresAt] = useState<number | null>(
    null,
  );
  const [syncStatus, setSyncStatus] = useState<InspectionSyncStatus>(
    userId ? "syncing" : "local",
  );
  const syncInFlight = useRef(false);
  const draftRevision = useRef(0);

  const persistRecords = useCallback(
    (next: InspectionRecord[]) => {
      saveInspectionRecords(next);
      if (userId) saveCurrentAccountCache(userId);
    },
    [userId],
  );

  const markCloudFailure = useCallback(() => {
    setSyncStatus(navigator.onLine ? "error" : "offline");
  }, []);

  const runCloudChange = useCallback(
    async (operation: Promise<void>) => {
      setSyncStatus("syncing");
      try {
        await operation;
        setSyncStatus("synced");
      } catch {
        markCloudFailure();
      }
    },
    [markCloudFailure],
  );

  const syncNow = useCallback(async () => {
    if (!userId || syncInFlight.current) return;
    syncInFlight.current = true;
    const startingDraftRevision = draftRevision.current;
    setSyncStatus("syncing");
    try {
      const localState = loadInspectionState();
      const result = await syncInspectionAccount(userId, localState);
      saveInspectionRecords(result.records);
      if (draftRevision.current === startingDraftRevision) {
        saveInspectionDraft(result.draft);
        setValues(result.draft.values);
        setBeltTab(result.draft.beltTab);
      }
      saveCurrentAccountCache(userId);
      setRecords(result.records);
      setSyncStatus("synced");
    } catch {
      markCloudFailure();
    } finally {
      syncInFlight.current = false;
    }
  }, [markCloudFailure, userId]);

  useEffect(() => {
    let active = true;
    const loadStorage = window.setTimeout(async () => {
      const stored = userId
        ? prepareStorageForUser(userId)
        : loadInspectionState();
      if (!active) return;
      setRecords(stored.records);
      setValues(stored.values);
      setBeltTab(stored.beltTab);
      setLastBackupAt(loadLastBackupAt());
      setImportUndoExpiresAt(loadImportUndo()?.expiresAt ?? null);
      setDraftReady(true);
      if (userId) {
        await syncNow();
        if (!active) return;
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(loadStorage);
    };
  }, [syncNow, userId]);

  useEffect(() => {
    if (importUndoExpiresAt === null) return;

    const remaining = importUndoExpiresAt - Date.now();
    const expiryTimer = window.setTimeout(() => {
      clearImportUndo();
      setImportUndoExpiresAt(null);
    }, Math.max(0, remaining));

    return () => window.clearTimeout(expiryTimer);
  }, [importUndoExpiresAt]);

  useEffect(() => {
    if (!draftReady) return;
    const draft = { values, beltTab, updatedAt: new Date().toISOString() };
    saveInspectionDraft(draft);
    if (userId) saveCurrentAccountCache(userId);

    if (!userId) return;
    const uploadDraft = window.setTimeout(() => {
      void runCloudChange(pushInspectionDraft(userId, draft));
    }, 800);
    return () => window.clearTimeout(uploadDraft);
  }, [beltTab, draftReady, runCloudChange, userId, values]);

  useEffect(() => {
    if (!userId || !draftReady) return;
    const handleOnline = () => void syncNow();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void syncNow();
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [draftReady, syncNow, userId]);

  const updateValue = (fieldKey: string, value: string) => {
    draftRevision.current += 1;
    setValues((current) => ({ ...current, [fieldKey]: value }));
  };

  const clearKeys = (keys: string[]) => {
    draftRevision.current += 1;
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
    draftRevision.current += 1;
    setValues((current) => selectPump(current, area, group, index, pumpNo));
  };

  const selectBeltTab = (nextBeltTab: BeltId) => {
    draftRevision.current += 1;
    setBeltTab(nextBeltTab);
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
    draftRevision.current += 1;
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
    setSelectedRecord(null);
    setManageHistory(false);
    setSelectedRecordIds([]);
    setSaveValidation(null);
    setTab("history");
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
    const undoSnapshot = loadImportUndo();
    if (!undoSnapshot) {
      setImportUndoExpiresAt(null);
      toast.error("可撤销的恢复数据已不存在");
      return;
    }

    try {
      const previousRecords = undoSnapshot.records;
      persistRecords(previousRecords);
      setRecords(previousRecords);
      clearImportUndo();
      setImportUndoExpiresAt(null);
      setSelectedRecord(null);
      setManageHistory(false);
      setSelectedRecordIds([]);
      if (userId) {
        void runCloudChange(
          replaceCloudInspectionRecords(userId, previousRecords),
        );
      }
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
      const undoSnapshot = saveImportUndo(records);
      persistRecords(next);
      setRecords(next);
      setImportUndoExpiresAt(undoSnapshot.expiresAt);
      setSelectedRecord(null);
      setManageHistory(false);
      setSelectedRecordIds([]);
      closeBackup();
      if (userId) {
        void runCloudChange(replaceCloudInspectionRecords(userId, next));
      }
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
      canUndoImport: importUndoExpiresAt !== null,
      syncStatus,
    },
    actions: {
      updateValue,
      clearPump,
      choosePump,
      clearBeltItem,
      setBeltTab: selectBeltTab,
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
      syncNow,
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
