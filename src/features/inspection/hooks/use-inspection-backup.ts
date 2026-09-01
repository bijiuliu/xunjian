import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import type {
  InspectionImportPreview,
  InspectionRecord,
} from "../model/types";
import {
  createBackupFileName,
  createInspectionBackup,
  mergeInspectionRecords,
  parseInspectionBackup,
  sortInspectionRecords,
} from "../storage/inspection-backup";
import {
  clearImportUndo,
  loadImportUndo,
  loadLastBackupAt,
  saveImportUndo,
  saveLastBackupAt,
} from "../storage/inspection-storage";
import { replaceCloudInspectionRecords } from "../sync/inspection-cloud-sync";

type UseInspectionBackupOptions = {
  userId?: string;
  records: InspectionRecord[];
  setRecords: Dispatch<SetStateAction<InspectionRecord[]>>;
  persistRecords: (records: InspectionRecord[]) => void;
  runCloudChange: (operation: Promise<void>) => Promise<void>;
  onRecordsChanged: () => void;
};

export function useInspectionBackup({
  userId,
  records,
  setRecords,
  persistRecords,
  runCloudChange,
  onRecordsChanged,
}: UseInspectionBackupOptions) {
  const [backupOpen, setBackupOpen] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [importPreview, setImportPreview] =
    useState<InspectionImportPreview | null>(null);
  const [importUndoExpiresAt, setImportUndoExpiresAt] = useState<number | null>(
    null,
  );

  const initializeFromStorage = useCallback(() => {
    setLastBackupAt(loadLastBackupAt());
    setImportUndoExpiresAt(loadImportUndo()?.expiresAt ?? null);
  }, []);

  useEffect(() => {
    if (importUndoExpiresAt === null) return;

    const remaining = importUndoExpiresAt - Date.now();
    const expiryTimer = window.setTimeout(() => {
      clearImportUndo();
      setImportUndoExpiresAt(null);
    }, Math.max(0, remaining));

    return () => window.clearTimeout(expiryTimer);
  }, [importUndoExpiresAt]);

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
      onRecordsChanged();
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
      onRecordsChanged();
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
      backupOpen,
      lastBackupAt,
      importPreview,
      canUndoImport: importUndoExpiresAt !== null,
    },
    actions: {
      initializeFromStorage,
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
