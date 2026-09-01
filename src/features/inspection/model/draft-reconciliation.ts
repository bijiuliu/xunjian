import type {
  InspectionDraft,
  VersionedInspectionDraft,
} from "./types";

export type DraftPushResult = "committed" | "stale";

type ReconcileInspectionDraftOptions = {
  localDraft: InspectionDraft | null;
  fetchCloud: () => Promise<VersionedInspectionDraft | null>;
  pushLocal: (draft: VersionedInspectionDraft) => Promise<DraftPushResult>;
  now?: () => number;
};

export async function reconcileInspectionDraft({
  localDraft,
  fetchCloud,
  pushLocal,
  now = Date.now,
}: ReconcileInspectionDraftOptions): Promise<VersionedInspectionDraft | null> {
  const cloudDraft = await fetchCloud();

  if (!localDraft) return cloudDraft;

  const versionedLocal = toVersionedDraft(localDraft);
  if (!versionedLocal) {
    if (cloudDraft) return cloudDraft;
    return commitOrFetchLatest(
      {
        ...localDraft,
        updatedAt: new Date(now()).toISOString(),
      },
      pushLocal,
      fetchCloud,
    );
  }

  if (
    cloudDraft &&
    Date.parse(cloudDraft.updatedAt) >= Date.parse(versionedLocal.updatedAt)
  ) {
    return cloudDraft;
  }

  return commitOrFetchLatest(versionedLocal, pushLocal, fetchCloud);
}

export function createNextDraftUpdatedAt(
  previousUpdatedAt: string | undefined,
  now = Date.now(),
) {
  const previous = previousUpdatedAt ? Date.parse(previousUpdatedAt) : Number.NaN;
  const next = Number.isNaN(previous) ? now : Math.max(now, previous + 1);
  return new Date(next).toISOString();
}

export function parseDraftPushResult(value: unknown): DraftPushResult {
  if (value === true) return "committed";
  if (value === false) return "stale";
  throw new Error("草稿同步返回了无效结果");
}

function toVersionedDraft(
  draft: InspectionDraft,
): VersionedInspectionDraft | null {
  return typeof draft.updatedAt === "string" &&
    !Number.isNaN(Date.parse(draft.updatedAt))
    ? { ...draft, updatedAt: draft.updatedAt }
    : null;
}

async function commitOrFetchLatest(
  draft: VersionedInspectionDraft,
  pushLocal: (draft: VersionedInspectionDraft) => Promise<DraftPushResult>,
  fetchCloud: () => Promise<VersionedInspectionDraft | null>,
) {
  const result = await pushLocal(draft);
  if (result === "committed") return draft;

  const latestCloud = await fetchCloud();
  if (!latestCloud) {
    throw new Error("云端拒绝了旧草稿，但未返回更新版本");
  }
  return latestCloud;
}
