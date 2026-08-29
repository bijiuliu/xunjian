"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CircleCheck,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AuthMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password";

type AuthScreenProps = {
  passwordRecovery?: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<void>;
};

export function AuthScreen({
  passwordRecovery = false,
  onSignIn,
  onSignUp,
  onRequestPasswordReset,
  onUpdatePassword,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(
    passwordRecovery ? "reset-password" : "sign-in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setResetEmailSent(false);
    setFormError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (mode !== "forgot-password" && password.length < 8) {
      setFormError("密码至少需要 8 位");
      return;
    }
    if (mode === "reset-password" && password !== confirmPassword) {
      setFormError("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "sign-in") {
        await onSignIn(email.trim(), password);
        toast.success("登录成功");
      } else if (mode === "sign-up") {
        const result = await onSignUp(email.trim(), password);
        if (result.needsEmailConfirmation) {
          toast.success("注册成功，请查收验证邮件后登录");
          changeMode("sign-in");
        } else {
          toast.success("注册成功");
        }
      } else if (mode === "forgot-password") {
        await onRequestPasswordReset(email.trim());
        setResetEmailSent(true);
      } else {
        await onUpdatePassword(password);
        toast.success("密码已更新");
      }
    } catch (error) {
      setFormError(getAuthErrorMessage(error, mode));
    } finally {
      setSubmitting(false);
    }
  };

  const accountMode = mode === "sign-in" || mode === "sign-up";

  return (
    <main className="mx-auto flex min-h-svh max-w-md items-center bg-background px-page py-[max(2rem,env(safe-area-inset-top))]">
      <div className="w-full">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-card bg-primary text-primary-foreground shadow-primary">
            {mode === "reset-password" ? (
              <KeyRound className="size-7" />
            ) : (
              <ShieldCheck className="size-7" />
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            {mode === "reset-password" ? "设置新密码" : "夜班巡检"}
          </h1>
          <p className="mt-2 text-body text-muted-foreground">
            {mode === "forgot-password"
              ? "输入注册邮箱，我们会发送密码重置链接。"
              : mode === "reset-password"
                ? "请输入至少 8 位的新密码。"
                : "登录后，在不同设备间安全同步巡检内容。"}
          </p>
        </div>

        <Card>
          <CardContent className="p-5">
            {accountMode ? (
              <div className="mb-5 grid h-11 grid-cols-2 rounded-navigation bg-muted p-1">
                {(["sign-in", "sign-up"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => changeMode(item)}
                    className={`rounded-navigation-item text-body font-bold transition ${mode === item ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}
                  >
                    {item === "sign-in" ? "登录" : "注册"}
                  </button>
                ))}
              </div>
            ) : mode === "forgot-password" ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => changeMode("sign-in")}
                className="-ml-3 mb-3 px-3"
              >
                <ArrowLeft /> 返回登录
              </Button>
            ) : null}

            {resetEmailSent ? (
              <div className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
                  <CircleCheck className="size-6" />
                </div>
                <h2 className="mt-4 text-card-title font-bold">请查收重置邮件</h2>
                <p className="mt-2 text-body leading-6 text-muted-foreground">
                  如果该邮箱已注册，你会收到密码重置链接。没有收到时，请检查垃圾邮件或稍后重试。
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => changeMode("sign-in")}
                  className="mt-5 w-full"
                >
                  返回登录
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {mode !== "reset-password" && (
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-caption font-bold text-muted-foreground">
                      <Mail className="size-4" /> 邮箱
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className="min-h-12 w-full rounded-control border border-border bg-card px-4 text-body shadow-card outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                  </label>
                )}

                {mode !== "forgot-password" && (
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-caption font-bold text-muted-foreground">
                      <LockKeyhole className="size-4" />
                      {mode === "reset-password" ? "新密码" : "密码"}
                    </span>
                    <input
                      type="password"
                      autoComplete={
                        mode === "sign-in" ? "current-password" : "new-password"
                      }
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="至少 8 位"
                      className="min-h-12 w-full rounded-control border border-border bg-card px-4 text-body shadow-card outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                  </label>
                )}

                {mode === "reset-password" && (
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-caption font-bold text-muted-foreground">
                      <LockKeyhole className="size-4" /> 确认新密码
                    </span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="再次输入新密码"
                      className="min-h-12 w-full rounded-control border border-border bg-card px-4 text-body shadow-card outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                  </label>
                )}

                {formError && (
                  <p
                    role="alert"
                    className="rounded-small bg-destructive-soft px-3 py-2 text-caption font-semibold text-destructive"
                  >
                    {formError}
                  </p>
                )}

                {mode === "sign-in" && (
                  <button
                    type="button"
                    onClick={() => changeMode("forgot-password")}
                    className="ml-auto flex min-h-11 items-center px-1 text-caption font-bold text-primary"
                  >
                    忘记密码？
                  </button>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? "请稍候…"
                    : mode === "sign-in"
                      ? "登录"
                      : mode === "sign-up"
                        ? "创建账号"
                        : mode === "forgot-password"
                          ? "发送重置邮件"
                          : "保存新密码"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function getAuthErrorMessage(error: unknown, mode: AuthMode) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid login credentials")) return "邮箱或密码不正确";
  if (message.includes("already registered")) return "这个邮箱已经注册";
  if (
    message.includes("email rate limit") ||
    message.includes("only request this after")
  ) {
    return "邮件发送过于频繁，请稍后再试";
  }
  if (message.includes("same password")) return "新密码不能与原密码相同";
  if (message.includes("session") && mode === "reset-password") {
    return "重置链接无效或已过期，请重新发送";
  }
  if (message.includes("password")) return "密码不符合安全要求";
  if (mode === "forgot-password") return "重置邮件发送失败，请稍后重试";
  if (mode === "reset-password") return "密码更新失败，请重新打开重置链接";
  return mode === "sign-in" ? "登录失败，请稍后重试" : "注册失败，请稍后重试";
}
