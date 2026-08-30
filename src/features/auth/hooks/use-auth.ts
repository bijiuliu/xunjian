"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
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
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "others",
    });
    if (signOutError) throw signOutError;
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
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "others",
    });
    if (signOutError) throw signOutError;
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

function getCurrentAppUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}
