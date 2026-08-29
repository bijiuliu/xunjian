"use client";

import { useCallback, useEffect, useState } from "react";
import type { InspectionTab } from "@/features/inspection/model/types";
import {
  createDefaultPreferences,
  isNavigationOrder,
  type UserPreferences,
} from "../model/user-preferences";
import {
  getInitialUserPreferences,
  loadCachedUserPreferences,
  saveCachedUserPreferences,
} from "../storage/user-preferences-storage";
import {
  createAvatarUrl,
  deleteAvatar,
  fetchCloudUserPreferences,
  pushCloudUserPreferences,
  uploadAvatar,
} from "../sync/user-preferences-cloud";

export function useUserPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    userId ? getInitialUserPreferences(userId) : createDefaultPreferences(),
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(!userId);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const refreshAvatarUrl = useCallback(async (path: string | null) => {
    if (!path) {
      setAvatarUrl(null);
      return;
    }
    try {
      setAvatarUrl(await createAvatarUrl(path));
    } catch {
      setAvatarUrl(null);
    }
  }, []);

  const syncPreferences = useCallback(async () => {
    if (!userId) return;
    const cached = loadCachedUserPreferences(userId);

    try {
      const cloud = await fetchCloudUserPreferences(userId);
      let resolved: UserPreferences;

      if (
        cached?.pending &&
        (!cloud || Date.parse(cached.updatedAt) >= Date.parse(cloud.updatedAt))
      ) {
        resolved = {
          navigationOrder: [...cached.navigationOrder],
          avatarPath: cached.avatarPath,
          updatedAt: cached.updatedAt,
        };
        await pushCloudUserPreferences(userId, resolved);
      } else if (cloud) {
        resolved = cloud;
      } else if (cached) {
        resolved = {
          navigationOrder: [...cached.navigationOrder],
          avatarPath: cached.avatarPath,
          updatedAt: cached.updatedAt,
        };
        await pushCloudUserPreferences(userId, resolved);
      } else {
        resolved = {
          ...createDefaultPreferences(),
          updatedAt: new Date().toISOString(),
        };
        await pushCloudUserPreferences(userId, resolved);
      }

      saveCachedUserPreferences(userId, { ...resolved, pending: false });
      setPreferences(resolved);
      await refreshAvatarUrl(resolved.avatarPath);
    } catch {
      if (cached) {
        setPreferences(cached);
        await refreshAvatarUrl(cached.avatarPath);
      }
    } finally {
      setReady(true);
    }
  }, [refreshAvatarUrl, userId]);

  useEffect(() => {
    const initialSync = window.setTimeout(() => void syncPreferences(), 0);
    return () => window.clearTimeout(initialSync);
  }, [syncPreferences]);

  useEffect(() => {
    if (!userId) return;
    const handleOnline = () => void syncPreferences();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void syncPreferences();
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncPreferences, userId]);

  const persist = useCallback(
    async (next: UserPreferences) => {
      if (!userId) return;
      setPreferences(next);
      saveCachedUserPreferences(userId, { ...next, pending: true });
      try {
        await pushCloudUserPreferences(userId, next);
        saveCachedUserPreferences(userId, { ...next, pending: false });
      } catch {
        // The pending cache is reconciled when the app returns online.
      }
    },
    [userId],
  );

  const setNavigationOrder = useCallback(
    async (navigationOrder: InspectionTab[]) => {
      if (!isNavigationOrder(navigationOrder)) return;
      await persist({
        ...preferences,
        navigationOrder: [...navigationOrder],
        updatedAt: new Date().toISOString(),
      });
    },
    [persist, preferences],
  );

  const setAvatar = useCallback(
    async (file: File) => {
      if (!userId) return;
      setAvatarBusy(true);
      let uploadedPath: string | null = null;
      try {
        const avatar = await prepareAvatar(file);
        uploadedPath = await uploadAvatar(userId, avatar);
        const previousPath = preferences.avatarPath;
        const next = {
          ...preferences,
          avatarPath: uploadedPath,
          updatedAt: new Date().toISOString(),
        };
        await pushCloudUserPreferences(userId, next);
        saveCachedUserPreferences(userId, { ...next, pending: false });
        setPreferences(next);
        await refreshAvatarUrl(uploadedPath);
        if (previousPath) void deleteAvatar(previousPath);
      } catch (error) {
        if (uploadedPath) void deleteAvatar(uploadedPath);
        throw error;
      } finally {
        setAvatarBusy(false);
      }
    },
    [preferences, refreshAvatarUrl, userId],
  );

  const removeAvatar = useCallback(async () => {
    if (!userId || !preferences.avatarPath) return;
    const previousPath = preferences.avatarPath;
    setAvatarBusy(true);
    try {
      const next = {
        ...preferences,
        avatarPath: null,
        updatedAt: new Date().toISOString(),
      };
      await pushCloudUserPreferences(userId, next);
      saveCachedUserPreferences(userId, { ...next, pending: false });
      setPreferences(next);
      setAvatarUrl(null);
      await deleteAvatar(previousPath);
    } finally {
      setAvatarBusy(false);
    }
  }, [preferences, userId]);

  return {
    navigationOrder: preferences.navigationOrder,
    avatarPath: preferences.avatarPath,
    avatarUrl,
    ready,
    avatarBusy,
    setNavigationOrder,
    setAvatar,
    removeAvatar,
  };
}

async function prepareAvatar(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("头像图片不能超过 8MB");
  }

  const image = await loadImage(file);
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - size) / 2;
  const sourceY = (image.naturalHeight - size) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法处理头像");
  context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 256, 256);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("头像处理失败"))),
      "image/webp",
      0.82,
    );
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取这张图片"));
    };
    image.src = url;
  });
}
