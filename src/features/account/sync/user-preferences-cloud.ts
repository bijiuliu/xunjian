import { getSupabaseClient } from "@/lib/supabase/client";
import {
  isNavigationOrder,
  type UserPreferences,
} from "../model/user-preferences";

const AVATAR_BUCKET = "avatars";

type CloudUserPreferences = {
  user_id: string;
  navigation_order: unknown;
  avatar_path: string | null;
  updated_at: string;
};

export async function fetchCloudUserPreferences(
  userId: string,
): Promise<UserPreferences | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("user_id, navigation_order, avatar_path, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!isCloudUserPreferences(data)) return null;

  return {
    navigationOrder: [...data.navigation_order],
    avatarPath: data.avatar_path,
    updatedAt: data.updated_at,
  };
}

export async function pushCloudUserPreferences(
  userId: string,
  preferences: UserPreferences,
) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      navigation_order: preferences.navigationOrder,
      avatar_path: preferences.avatarPath,
      updated_at: preferences.updatedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function createAvatarUrl(path: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadAvatar(userId: string, file: Blob) {
  const supabase = requireSupabase();
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deleteAvatar(path: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw error;
}

function isCloudUserPreferences(
  value: unknown,
): value is CloudUserPreferences & { navigation_order: ReturnTypeNavigationOrder } {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CloudUserPreferences>;
  return (
    typeof row.user_id === "string" &&
    isNavigationOrder(row.navigation_order) &&
    (row.avatar_path === null || typeof row.avatar_path === "string") &&
    typeof row.updated_at === "string" &&
    !Number.isNaN(Date.parse(row.updated_at))
  );
}

type ReturnTypeNavigationOrder = UserPreferences["navigationOrder"];

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase 尚未配置");
  return supabase;
}
