"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type InspectionSyncEventsOptions = {
  userId?: string;
  draftReady: boolean;
  syncNow: (background?: boolean) => Promise<void>;
};

/** External triggers only. Revisions, retries and request ownership stay in the controller. */
export function useInspectionSyncEvents({
  userId,
  draftReady,
  syncNow,
}: InspectionSyncEventsOptions) {
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
}
