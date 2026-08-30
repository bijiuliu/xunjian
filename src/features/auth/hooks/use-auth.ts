"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export type AuthStatus =
  | "loading"
  | "signed-out"
  | "signed-in"
  | "password-recovery"
  | "local";

export function useAuth() {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "local",
  );
  const [user, setUser] = useState<User | null>(null);
  const passwordRecovery = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let active = true;
    passwordRecovery.current = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("type") === "recovery";

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setStatus(
        data.session
          ? passwordRecovery.current
            ? "password-recovery"
            : "signed-in"
          : "signed-out",
      );
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY") {
        passwordRecovery.current = true;
        setUser(session?.user ?? null);
        setStatus("password-recovery");
        return;
      }

      if (event === "SIGNED_OUT") {
        passwordRecovery.current = false;
        setUser(null);
        setStatus("signed-out");
        return;
      }

      if (passwordRecovery.current) return;
      setUser(session?.user ?? null);
      setStatus(session ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) return;

    let signingOut = false;
    const enforceRevocation = async (value?: unknown) => {
      if (signingOut) return;
      try {
        if (!(await isCurrentSessionRevoked(supabase, userId, value))) return;
        signingOut = true;
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Retry when the app returns online or becomes visible again.
      } finally {
        signingOut = false;
      }
    };

    const channel = supabase
      .channel(`session-revocation:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_preferences",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => void enforceRevocation(payload.new),
      )
      .subscribe();

    void enforceRevocation();
    const handleOnline = () => void enforceRevocation();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void enforceRevocation();
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase 尚未配置");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase 尚未配置");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getCurrentAppUrl(),
      },
    });
    if (error) throw error;
    return {
      needsEmailConfirmation: !data.session,
      alreadyRegistered:
        Array.isArray(data.user?.identities) && data.user.identities.length === 0,
    };
  };

  const resendSignUpConfirmation = async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase 尚未配置");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getCurrentAppUrl(),
      },
    });
    if (error) throw error;
  };

  const requestPasswordReset = async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase 尚未配置");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getCurrentAppUrl(),
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase 尚未配置");
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    await revokeOtherSessions(supabase, data.user.id);
    passwordRecovery.current = false;
    setUser(data.user);
    setStatus("signed-in");
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase 尚未配置");

    const email = user?.email;
    if (!email) throw new Error("当前账号缺少邮箱，无法验证密码");

    const { error: verificationError } =
      await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
    if (verificationError) throw verificationError;

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    if (error) throw error;
    await revokeOtherSessions(supabase, data.user.id);
    setUser(data.user);
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    configured,
    status,
    user,
    signIn,
    signUp,
    resendSignUpConfirmation,
    requestPasswordReset,
    updatePassword,
    changePassword,
    signOut,
  };
}

type SessionRevocationMarker = {
  sessions_revoked_at: string;
  sessions_revoked_by: string;
};

async function revokeOtherSessions(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError) throw claimsError;
  const sessionId = claimsData?.claims.session_id;
  if (!sessionId) throw new Error("无法识别当前登录会话");

  const { error: signOutError } = await supabase.auth.signOut({
    scope: "others",
  });
  if (signOutError) throw signOutError;

  const { error: markerError } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        sessions_revoked_at: new Date().toISOString(),
        sessions_revoked_by: sessionId,
      },
      { onConflict: "user_id" },
    );
  if (markerError) throw markerError;
}

async function isCurrentSessionRevoked(
  supabase: SupabaseClient,
  userId: string,
  value?: unknown,
) {
  let marker = parseSessionRevocationMarker(value);
  if (!marker) {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("sessions_revoked_at, sessions_revoked_by")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    marker = parseSessionRevocationMarker(data);
  }
  if (!marker) return false;

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError) throw claimsError;
  const claims = claimsData?.claims;
  if (!claims || marker.sessions_revoked_by === claims.session_id) return false;

  return claims.iat * 1000 < Date.parse(marker.sessions_revoked_at);
}

function parseSessionRevocationMarker(
  value: unknown,
): SessionRevocationMarker | null {
  if (!value || typeof value !== "object") return null;
  const marker = value as Partial<SessionRevocationMarker>;
  if (
    typeof marker.sessions_revoked_at !== "string" ||
    Number.isNaN(Date.parse(marker.sessions_revoked_at)) ||
    typeof marker.sessions_revoked_by !== "string"
  ) {
    return null;
  }
  return marker as SessionRevocationMarker;
}

function getCurrentAppUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}
