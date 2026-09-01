import { getSupabaseClient } from "@/lib/supabase/client";
import { isBeltId } from "../model/field-rules";
import {
  parseDraftPushResult,
  reconcileInspectionDraft,
  type DraftPushResult,
} from "../model/draft-reconciliation";
import { getInspectionRecordCreatedAt } from "../model/record-time";
import type {
  BeltId,
  InspectionRecord,
  InspectionValues,
  VersionedInspectionDraft,
} from "../model/types";
import {
  isInspectionRecord,
  sortInspectionRecords,
} from "../storage/inspection-backup";
import type { StoredInspectionState } from "../storage/inspection-storage";

const SYNC_QUEUE_PREFIX = "night-inspection-sync-queue:";
const CLOUD_RECORD_PAGE_SIZE = 500;

type CloudInspectionRecord = {
  id: string;
  user_id: string;
  inspection_date: string;
  inspection_time: string;
  recorded_at: string | null;
  values: InspectionValues;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CloudInspectionDraft = {
  user_id: string;
  values: InspectionValues;
  belt_tab: BeltId;
  updated_at: string;
};

type SyncOperation =
  | { type: "upsert"; record: InspectionRecord }
  | { type: "delete"; ids: string[] }
  | { type: "replace"; records: InspectionRecord[] };

export type CloudSyncResult = {
  records: InspectionRecord[];
  draft: VersionedInspectionDraft | null;
};

export async function syncInspectionAccount(
  userId: string,
  localState: StoredInspectionState,
): Promise<CloudSyncResult> {
  await flushSyncQueue(userId);
  const cloudRows = await fetchCloudRecords(userId);
  const cloudIds = new Set(cloudRows.map((row) => row.id));
  const localOnly = localState.records.filter((record) => !cloudIds.has(record.id));

  if (localOnly.length > 0) {
    await upsertRecords(userId, localOnly);
  }

  const activeCloudRecords = cloudRows
    .filter((row) => !row.deleted_at)
    .map(fromCloudRecord)
    .filter(isInspectionRecord);
  const records = sortInspectionRecords([...activeCloudRecords, ...localOnly]);
  const draft = await reconcileDraft(userId, localState);

  return { records, draft };
}

export async function pushInspectionRecord(
  userId: string,
  record: InspectionRecord,
) {
  try {
    await upsertRecords(userId, [record]);
  } catch (error) {
    appendSyncOperation(userId, { type: "upsert", record });
    throw error;
  }
}

export async function deleteCloudInspectionRecords(
  userId: string,
  ids: string[],
) {
  try {
    await softDeleteRecords(userId, ids);
  } catch (error) {
    appendSyncOperation(userId, { type: "delete", ids });
    throw error;
  }
}

export async function replaceCloudInspectionRecords(
  userId: string,
  records: InspectionRecord[],
) {
  try {
    await applyReplacement(userId, records);
  } catch (error) {
    saveSyncQueue(userId, [{ type: "replace", records }]);
    throw error;
  }
}

export async function pushInspectionDraft(
  userId: string,
  draft: VersionedInspectionDraft,
): Promise<DraftPushResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("upsert_inspection_draft_if_newer", {
    p_user_id: userId,
    p_values: draft.values,
    p_belt_tab: draft.beltTab,
    p_updated_at: draft.updatedAt,
  });
  if (error) throw error;
  return parseDraftPushResult(data);
}

async function reconcileDraft(
  userId: string,
  localState: StoredInspectionState,
): Promise<VersionedInspectionDraft | null> {
  const localDraft = localState.hasDraft
    ? {
        values: localState.values,
        beltTab: localState.beltTab,
        ...(localState.draftUpdatedAt
          ? { updatedAt: localState.draftUpdatedAt }
          : {}),
      }
    : null;

  return reconcileInspectionDraft({
    localDraft,
    fetchCloud: () => fetchCloudDraft(userId),
    pushLocal: (draft) => pushInspectionDraft(userId, draft),
  });
}

async function fetchCloudDraft(
  userId: string,
): Promise<VersionedInspectionDraft | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("inspection_drafts")
    .select("user_id, values, belt_tab, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  const cloudDraft = isCloudDraft(data) ? data : null;
  return cloudDraft
    ? {
        values: cloudDraft.values,
        beltTab: cloudDraft.belt_tab,
        updatedAt: cloudDraft.updated_at,
      }
    : null;
}

async function flushSyncQueue(userId: string) {
  const queue = loadSyncQueue(userId);
  if (queue.length === 0) return;

  for (let index = 0; index < queue.length; index += 1) {
    try {
      await applyOperation(userId, queue[index]);
    } catch (error) {
      saveSyncQueue(userId, queue.slice(index));
      throw error;
    }
  }

  saveSyncQueue(userId, []);
}

async function applyOperation(userId: string, operation: SyncOperation) {
  if (operation.type === "upsert") {
    await upsertRecords(userId, [operation.record]);
    return;
  }
  if (operation.type === "delete") {
    await softDeleteRecords(userId, operation.ids);
    return;
  }
  await applyReplacement(userId, operation.records);
}

async function applyReplacement(userId: string, records: InspectionRecord[]) {
  const activeCloudRows = (await fetchCloudRecords(userId)).filter(
    (row) => !row.deleted_at,
  );
  const desiredIds = new Set(records.map((record) => record.id));
  const deletingIds = activeCloudRows
    .filter((row) => !desiredIds.has(row.id))
    .map((row) => row.id);

  await upsertRecords(userId, records);
  await softDeleteRecords(userId, deletingIds);
}

async function fetchCloudRecords(userId: string) {
  const supabase = requireSupabase();
  const records: CloudInspectionRecord[] = [];
  let lastId: string | null = null;

  while (true) {
    let query = supabase
      .from("inspection_records")
      .select(
        "id, user_id, inspection_date, inspection_time, recorded_at, values, created_at, updated_at, deleted_at",
      )
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .limit(CLOUD_RECORD_PAGE_SIZE);
    if (lastId) query = query.gt("id", lastId);

    const { data, error } = await query;
    if (error) throw error;
    const page = data ?? [];
    records.push(...page.filter(isCloudRecord));

    if (page.length < CLOUD_RECORD_PAGE_SIZE) break;
    const nextLastId = page.at(-1)?.id;
    if (typeof nextLastId !== "string" || nextLastId === lastId) {
      throw new Error("云端巡检记录分页游标无效");
    }
    lastId = nextLastId;
  }

  return records;
}

async function upsertRecords(userId: string, records: InspectionRecord[]) {
  if (records.length === 0) return;
  const supabase = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase.from("inspection_records").upsert(
    records.map((record) => ({
      id: record.id,
      user_id: userId,
      inspection_date: record.date,
      inspection_time: record.time,
      recorded_at: getInspectionRecordCreatedAt(record),
      values: record.values,
      updated_at: now,
      deleted_at: null,
    })),
    { onConflict: "user_id,id" },
  );
  if (error) throw error;
}

async function softDeleteRecords(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  const supabase = requireSupabase();
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from("inspection_records")
    .update({ deleted_at: timestamp, updated_at: timestamp })
    .eq("user_id", userId)
    .in("id", ids);
  if (error) throw error;
}

function fromCloudRecord(row: CloudInspectionRecord): InspectionRecord {
  return {
    id: row.id,
    date: row.inspection_date,
    time: row.inspection_time,
    createdAt:
      row.recorded_at ??
      getInspectionRecordCreatedAt({ time: row.inspection_time }) ??
      row.created_at,
    values: row.values,
  };
}

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase 尚未配置");
  return supabase;
}

function appendSyncOperation(userId: string, operation: SyncOperation) {
  const queue = loadSyncQueue(userId);
  if (operation.type === "upsert") {
    const next = queue.filter(
      (item) => item.type !== "upsert" || item.record.id !== operation.record.id,
    );
    saveSyncQueue(userId, [...next, operation]);
    return;
  }
  saveSyncQueue(userId, [...queue, operation]);
}

function loadSyncQueue(userId: string): SyncOperation[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(`${SYNC_QUEUE_PREFIX}${userId}`) || "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSyncOperation);
  } catch {
    return [];
  }
}

function saveSyncQueue(userId: string, queue: SyncOperation[]) {
  const key = `${SYNC_QUEUE_PREFIX}${userId}`;
  if (queue.length === 0) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(queue));
}

function isSyncOperation(value: unknown): value is SyncOperation {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const operation = value as Partial<SyncOperation>;
  if (operation.type === "upsert") return isInspectionRecord(operation.record);
  if (operation.type === "delete") {
    return (
      Array.isArray(operation.ids) &&
      operation.ids.every((id) => typeof id === "string")
    );
  }
  return (
    operation.type === "replace" &&
    Array.isArray(operation.records) &&
    operation.records.every(isInspectionRecord)
  );
}

function isCloudRecord(value: unknown): value is CloudInspectionRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CloudInspectionRecord>;
  return (
    typeof row.id === "string" &&
    typeof row.user_id === "string" &&
    typeof row.inspection_date === "string" &&
    typeof row.inspection_time === "string" &&
    (row.recorded_at === null || typeof row.recorded_at === "string") &&
    isInspectionValues(row.values) &&
    typeof row.created_at === "string" &&
    typeof row.updated_at === "string" &&
    (row.deleted_at === null || typeof row.deleted_at === "string")
  );
}

function isCloudDraft(value: unknown): value is CloudInspectionDraft {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CloudInspectionDraft>;
  return (
    typeof row.user_id === "string" &&
    isInspectionValues(row.values) &&
    isBeltId(row.belt_tab) &&
    typeof row.updated_at === "string"
  );
}

function isInspectionValues(value: unknown): value is InspectionValues {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((fieldValue) => typeof fieldValue === "string")
  );
}
