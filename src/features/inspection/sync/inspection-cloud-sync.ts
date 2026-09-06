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
import {
  enqueueInspectionSyncOperation,
  flushInspectionSyncQueue,
  getPendingInspectionSyncCount,
  type InspectionSyncOperation,
} from "./inspection-sync-queue";

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

export type CloudSyncResult = {
  records: InspectionRecord[];
  draft: VersionedInspectionDraft | null;
};

export async function syncInspectionAccount(
  userId: string,
  localState: StoredInspectionState,
): Promise<CloudSyncResult> {
  await flushSyncQueue(userId);
  let cloudRows = await fetchCloudRecords(userId);
  const cloudIds = new Set(cloudRows.map((row) => row.id));
  const localOnly = localState.records.filter((record) => !cloudIds.has(record.id));

  if (localOnly.length > 0) {
    await upsertRecords(userId, localOnly);
    // Insert-only uploads intentionally cannot revive tombstones. Refetch so
    // deleted records are not accidentally restored to the local list.
    cloudRows = await fetchCloudRecords(userId);
  }

  const activeCloudRecords = cloudRows
    .filter((row) => !row.deleted_at)
    .map(fromCloudRecord)
    .filter(isInspectionRecord);
  const records = sortInspectionRecords(activeCloudRecords);
  const draft = await reconcileDraft(userId, localState);

  return { records, draft };
}

export async function pushInspectionRecord(
  userId: string,
  record: InspectionRecord,
) {
  enqueueInspectionSyncOperation(userId, { type: "upsert", record });
  await flushSyncQueue(userId);
}

export async function deleteCloudInspectionRecords(
  userId: string,
  ids: string[],
) {
  enqueueInspectionSyncOperation(userId, { type: "delete", ids });
  await flushSyncQueue(userId);
}

export async function mergeCloudInspectionRecords(
  userId: string,
  records: InspectionRecord[],
) {
  enqueueInspectionSyncOperation(userId, { type: "merge", records });
  await flushSyncQueue(userId);
}

export async function replaceCloudInspectionRecords(
  userId: string,
  records: InspectionRecord[],
) {
  enqueueInspectionSyncOperation(userId, { type: "replace", records });
  await flushSyncQueue(userId);
}

export { getPendingInspectionSyncCount };

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
  await flushInspectionSyncQueue(userId, (operation) =>
    applyOperation(userId, operation),
  );
}

async function applyOperation(
  userId: string,
  operation: InspectionSyncOperation,
) {
  if (operation.type === "upsert") {
    await upsertRecords(userId, [operation.record]);
    return;
  }
  if (operation.type === "delete") {
    await softDeleteRecords(userId, operation.ids);
    return;
  }
  if (operation.type === "merge") {
    await upsertRecords(userId, operation.records);
    return;
  }
  await applyReplacement(userId, operation.records);
}

async function applyReplacement(userId: string, records: InspectionRecord[]) {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("replace_inspection_records", {
    p_user_id: userId,
    p_records: records.map((record) => ({
      id: record.id,
      inspection_date: record.date,
      inspection_time: record.time,
      recorded_at: getInspectionRecordCreatedAt(record),
      values: record.values,
    })),
  });
  if (!error) return;
  if (error.code !== "PGRST202") throw error;

  // During a rolling deployment an older database may not expose the RPC
  // yet. Keep the existing eventually-consistent fallback until the
  // migration reaches that environment.
  const activeCloudRows = (await fetchCloudRecords(userId)).filter(
    (row) => !row.deleted_at,
  );
  const desiredIds = new Set(records.map((record) => record.id));
  await restoreRecords(userId, records);
  await softDeleteRecords(
    userId,
    activeCloudRows
      .filter((row) => !desiredIds.has(row.id))
      .map((row) => row.id),
  );
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
  const { error } = await supabase.from("inspection_records").upsert(
    records.map((record) => ({
      id: record.id,
      user_id: userId,
      inspection_date: record.date,
      inspection_time: record.time,
      recorded_at: getInspectionRecordCreatedAt(record),
      values: record.values,
    })),
    { onConflict: "user_id,id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

async function restoreRecords(userId: string, records: InspectionRecord[]) {
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
