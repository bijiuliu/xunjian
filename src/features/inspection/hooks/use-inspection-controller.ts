"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createNextDraftUpdatedAt } from "../model/draft-reconciliation";
import {
  getBeltItemKeys,
  getPumpCardKeys,
  selectPump,
} from "../model/field-rules";
import type {
  BeltId,
  InspectionDraft,
  InspectionRecord,
  InspectionTab,
  InspectionValues,
  PumpAreaId,
  VersionedInspectionDraft,
} from "../model/types";
import {
  clearInspectionDraft,
  loadInspectionState,
  prepareStorageForUser,
  saveCurrentAccountCache,
  saveInspectionDraft,
  saveInspectionRecords,
} from "../storage/inspection-storage";
import {
  pushInspectionDraft,
  syncInspectionAccount,
} from "../sync/inspection-cloud-sync";
import { useInspectionBackup } from "./use-inspection-backup";
import { useInspectionHistory } from "./use-inspection-history";

export type InspectionSyncStatus =
  | "local"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

type PendingDraftUpload = {
  draft: VersionedInspectionDraft;
  revision: number;
};

export function useInspectionController(userId?: string) {
  const [tab, setTab] = useState<InspectionTab>("slag8");
  const [beltTab, setBeltTab] = useState<BeltId>("SZ101");
  const [values, setValues] = useState<InspectionValues>({});
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [draftReady, setDraftReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<InspectionSyncStatus>(
    userId ? "syncing" : "local",
  );
  const syncInFlight = useRef(false);
  const draftRevision = useRef(0);
  const confirmedDraftRevision = useRef(0);
  const draftSnapshot = useRef<InspectionDraft | null>(null);
  const [pendingDraftUpload, setPendingDraftUpload] =
    useState<PendingDraftUpload | null>(null);

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
        if (confirmedDraftRevision.current === draftRevision.current) {
          setSyncStatus("synced");
        }
      } catch {
        markCloudFailure();
      }
    },
    [markCloudFailure],
  );

  const showHistory = useCallback(() => setTab("history"), []);
  const history = useInspectionHistory({
    userId,
    records,
    values,
    setRecords,
    persistRecords,
    runCloudChange,
    showHistory,
  });
  const backup = useInspectionBackup({
    userId,
    records,
    setRecords,
    persistRecords,
    runCloudChange,
    onRecordsChanged: history.actions.resetAfterRecordsChanged,
  });
  const initializeBackupFromStorage = backup.actions.initializeFromStorage;

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
        if (result.draft) {
          saveInspectionDraft(result.draft);
          draftSnapshot.current = result.draft;
          setValues(result.draft.values);
          setBeltTab(result.draft.beltTab);
        } else {
          clearInspectionDraft();
          draftSnapshot.current = null;
        }
        confirmedDraftRevision.current = startingDraftRevision;
        setPendingDraftUpload(null);
      }
      saveCurrentAccountCache(userId);
      setRecords(result.records);
      if (draftRevision.current === startingDraftRevision) {
        setSyncStatus("synced");
      }
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
      draftSnapshot.current = stored.hasDraft
        ? {
            values: stored.values,
            beltTab: stored.beltTab,
            ...(stored.draftUpdatedAt
              ? { updatedAt: stored.draftUpdatedAt }
              : {}),
          }
        : null;
      confirmedDraftRevision.current = userId ? -1 : draftRevision.current;
      setPendingDraftUpload(null);
      initializeBackupFromStorage();
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
  }, [initializeBackupFromStorage, syncNow, userId]);

  useEffect(() => {
    if (!draftReady || !userId || !pendingDraftUpload) return;
    let uploadDraft = 0;
    const upload = async () => {
      if (syncInFlight.current) {
        uploadDraft = window.setTimeout(upload, 100);
        return;
      }
      setSyncStatus("syncing");
      try {
        const result = await pushInspectionDraft(
          userId,
          pendingDraftUpload.draft,
        );
        if (result === "stale") {
          await syncNow();
          return;
        }
        if (draftRevision.current === pendingDraftUpload.revision) {
          confirmedDraftRevision.current = pendingDraftUpload.revision;
          setPendingDraftUpload(null);
          setSyncStatus("synced");
        }
      } catch {
        markCloudFailure();
      }
    };
    uploadDraft = window.setTimeout(upload, 800);
    return () => window.clearTimeout(uploadDraft);
  }, [draftReady, markCloudFailure, pendingDraftUpload, syncNow, userId]);

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

  const applyDraftChange = useCallback(
    (
      change: (
        current: InspectionDraft,
      ) => Pick<InspectionDraft, "values" | "beltTab">,
    ) => {
      const current = draftSnapshot.current ?? {
        values: {},
        beltTab: "SZ101" as const,
      };
      const changed = change(current);
      const draft: VersionedInspectionDraft = {
        ...changed,
        updatedAt: createNextDraftUpdatedAt(current.updatedAt),
      };
      const revision = draftRevision.current + 1;
      draftRevision.current = revision;
      draftSnapshot.current = draft;
      saveInspectionDraft(draft);
      if (userId) saveCurrentAccountCache(userId);
      setValues(draft.values);
      setBeltTab(draft.beltTab);
      setPendingDraftUpload({ draft, revision });
      setSyncStatus(
        userId ? (navigator.onLine ? "syncing" : "offline") : "local",
      );
    },
    [userId],
  );

  const updateValue = (fieldKey: string, value: string) => {
    applyDraftChange((current) => ({
      values: { ...current.values, [fieldKey]: value },
      beltTab: current.beltTab,
    }));
  };

  const clearKeys = (keys: string[]) => {
    applyDraftChange((current) => ({
      values: {
        ...current.values,
        ...Object.fromEntries(keys.map((key) => [key, ""])),
      },
      beltTab: current.beltTab,
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
    applyDraftChange((current) => ({
      values: selectPump(current.values, area, group, index, pumpNo),
      beltTab: current.beltTab,
    }));
  };

  const selectBeltTab = (nextBeltTab: BeltId) => {
    applyDraftChange((current) => ({
      values: current.values,
      beltTab: nextBeltTab,
    }));
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
      history.actions.resetHistoryList();
    }
  };

  const createNewInspection = () => {
    applyDraftChange(() => ({ values: {}, beltTab: "SZ101" }));
    toast("已新建空白记录");
  };

  return {
    state: {
      tab,
      beltTab,
      values,
      records,
      ...history.state,
      ...backup.state,
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
      selectRecord: history.actions.selectRecord,
      returnToHistoryList: history.actions.returnToHistoryList,
      toggleHistoryManagement: history.actions.toggleHistoryManagement,
      toggleRecord: history.actions.toggleRecord,
      setDeleteRequest: history.actions.setDeleteRequest,
      confirmDeleteRecords: history.actions.confirmDeleteRecords,
      commitSave: history.actions.commitSave,
      save: history.actions.save,
      cancelSaveValidation: history.actions.cancelSaveValidation,
      cancelDeleteRequest: history.actions.cancelDeleteRequest,
      openBackup: backup.actions.openBackup,
      closeBackup: backup.actions.closeBackup,
      exportBackup: backup.actions.exportBackup,
      previewImportFile: backup.actions.previewImportFile,
      cancelImportPreview: backup.actions.cancelImportPreview,
      mergeImport: backup.actions.mergeImport,
      replaceImport: backup.actions.replaceImport,
      undoImport: backup.actions.undoImport,
      syncNow,
    },
  };
}
