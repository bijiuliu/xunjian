"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabase/client";
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
  getPendingInspectionSyncCount,
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
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const syncInFlight = useRef(false);
  const syncNowRef = useRef<(background?: boolean) => Promise<void>>(async () => undefined);
  const syncRerunRequested = useRef(false);
  const recordsRevision = useRef(0);
  const retryAttempt = useRef(0);
  const draftRevision = useRef(0);
  const confirmedDraftRevision = useRef(0);
  const draftSnapshot = useRef<InspectionDraft | null>(null);
  const [pendingDraftUpload, setPendingDraftUpload] =
    useState<PendingDraftUpload | null>(null);

  const persistRecords = useCallback(
    (next: InspectionRecord[]) => {
      saveInspectionRecords(next);
      recordsRevision.current += 1;
      if (userId) saveCurrentAccountCache(userId);
    },
    [userId],
  );

  const markCloudFailure = useCallback(() => {
    if (userId) {
      setPendingSyncCount(getPendingInspectionSyncCount(userId));
    }
    setSyncStatus(navigator.onLine ? "error" : "offline");
  }, [userId]);

  const runCloudChange = useCallback(
    async (operation: Promise<void>) => {
      setSyncStatus("syncing");
      if (userId) {
        setPendingSyncCount(getPendingInspectionSyncCount(userId));
      }
      try {
        await operation;
        const pending = userId ? getPendingInspectionSyncCount(userId) : 0;
        setPendingSyncCount(pending);
        if (
          pending === 0 &&
          !syncInFlight.current &&
          confirmedDraftRevision.current === draftRevision.current
        ) {
          retryAttempt.current = 0;
          setLastSyncedAt(new Date().toISOString());
          setSyncStatus("synced");
        }
      } catch {
        markCloudFailure();
      }
    },
    [markCloudFailure, userId],
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

  const syncNow = useCallback(async (background = false) => {
    if (!userId) return;
    // Realtime echoes still reconcile data, but must not restart the spinner.
    // Explicit requests can promote an already-running background check.
    if (!background) setSyncStatus("syncing");
    if (syncInFlight.current) {
      syncRerunRequested.current = true;
      return;
    }
    syncInFlight.current = true;
    syncRerunRequested.current = false;
    const startingDraftRevision = draftRevision.current;
    const startingRecordsRevision = recordsRevision.current;
    setPendingSyncCount(getPendingInspectionSyncCount(userId));
    try {
      const localState = loadInspectionState();
      const result = await syncInspectionAccount(userId, localState);
      if (recordsRevision.current === startingRecordsRevision) {
        saveInspectionRecords(result.records);
        setRecords(result.records);
      } else {
        // A save, delete or import happened after this request started. Its
        // local snapshot must win until a fresh synchronization completes.
        syncRerunRequested.current = true;
      }
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
      const pending = getPendingInspectionSyncCount(userId);
      setPendingSyncCount(pending);
      if (
        pending === 0 &&
        recordsRevision.current === startingRecordsRevision &&
        draftRevision.current === startingDraftRevision
      ) {
        retryAttempt.current = 0;
        setLastSyncedAt(new Date().toISOString());
        setSyncStatus("synced");
      }
    } catch {
      markCloudFailure();
    } finally {
      syncInFlight.current = false;
      if (syncRerunRequested.current) {
        syncRerunRequested.current = false;
        window.setTimeout(() => void syncNowRef.current(true), 0);
      }
    }
  }, [markCloudFailure, userId]);

  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

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
      recordsRevision.current = 0;
      setPendingSyncCount(
        userId ? getPendingInspectionSyncCount(userId) : 0,
      );
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
          const pending = getPendingInspectionSyncCount(userId);
          setPendingSyncCount(pending);
          if (pending === 0) {
            retryAttempt.current = 0;
            setLastSyncedAt(new Date().toISOString());
            setSyncStatus("synced");
          }
        }
      } catch {
        markCloudFailure();
      }
    };
    uploadDraft = window.setTimeout(upload, 800);
    return () => window.clearTimeout(uploadDraft);
  }, [draftReady, markCloudFailure, pendingDraftUpload, syncNow, userId]);

  useEffect(() => {
    if (!userId || syncStatus !== "error" || !navigator.onLine) return;
    const delays = [1_000, 3_000, 10_000, 30_000];
    const delay = delays[Math.min(retryAttempt.current, delays.length - 1)];
    retryAttempt.current += 1;
    const timer = window.setTimeout(() => void syncNow(), delay);
    return () => window.clearTimeout(timer);
  }, [syncNow, syncStatus, userId]);

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

  useEffect(() => {
    if (!userId || !draftReady) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let refreshTimer = 0;
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void syncNow(true), 200);
    };
    const channel = supabase
      .channel(`inspection-sync:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inspection_records",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inspection_drafts",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
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
      pendingSyncCount,
      lastSyncedAt,
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
