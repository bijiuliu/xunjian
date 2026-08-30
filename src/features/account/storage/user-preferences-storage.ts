import {
  createDefaultPreferences,
  isNavigationOrder,
  type UserPreferences,
} from "../model/user-preferences";

const PREFERENCES_CACHE_PREFIX = "night-inspection-preferences:";
const AVATAR_URL_CACHE_PREFIX = "night-inspection-avatar-url:";
const AVATAR_URL_CACHE_DURATION_MS = 55 * 60 * 1000;

type CachedAvatarUrl = {
  path: string;
  url: string;
  expiresAt: number;
};

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


export function loadCachedAvatarUrl(userId: string, path: string | null) {
  if (!path) return null;

  try {
    const parsed = JSON.parse(
      localStorage.getItem(`${AVATAR_URL_CACHE_PREFIX}${userId}`) || "null",
    ) as Partial<CachedAvatarUrl> | null;

    if (
      !parsed ||
      parsed.path !== path ||
      typeof parsed.url !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now()
    ) {
      return null;
    }

    return parsed.url;
  } catch {
    return null;
  }
}

export function saveCachedAvatarUrl(userId: string, path: string, url: string) {
  const value: CachedAvatarUrl = {
    path,
    url,
    expiresAt: Date.now() + AVATAR_URL_CACHE_DURATION_MS,
  };
  localStorage.setItem(`${AVATAR_URL_CACHE_PREFIX}${userId}`, JSON.stringify(value));
}

export function clearCachedAvatarUrl(userId: string) {
  localStorage.removeItem(`${AVATAR_URL_CACHE_PREFIX}${userId}`);
}
