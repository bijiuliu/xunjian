import {
  createDefaultPreferences,
  isNavigationOrder,
  type UserPreferences,
} from "../model/user-preferences";

const PREFERENCES_CACHE_PREFIX = "night-inspection-preferences:";

export type CachedUserPreferences = UserPreferences & {
  pending: boolean;
};

export function loadCachedUserPreferences(
  userId: string,
): CachedUserPreferences | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(`${PREFERENCES_CACHE_PREFIX}${userId}`) || "null",
    ) as Partial<CachedUserPreferences> | null;

    if (
      !parsed ||
      !isNavigationOrder(parsed.navigationOrder) ||
      typeof parsed.updatedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.updatedAt))
    ) {
      return null;
    }

    return {
      navigationOrder: [...parsed.navigationOrder],
      avatarPath:
        typeof parsed.avatarPath === "string" ? parsed.avatarPath : null,
      updatedAt: parsed.updatedAt,
      pending: Boolean(parsed.pending),
    };
  } catch {
    return null;
  }
}

export function saveCachedUserPreferences(
  userId: string,
  preferences: CachedUserPreferences,
) {
  localStorage.setItem(
    `${PREFERENCES_CACHE_PREFIX}${userId}`,
    JSON.stringify(preferences),
  );
}

export function getInitialUserPreferences(userId: string): UserPreferences {
  return loadCachedUserPreferences(userId) ?? createDefaultPreferences();
}
