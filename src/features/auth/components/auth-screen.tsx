"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AuthScreenProps = {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
};

export function AuthScreen({ onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("密码至少需要 8 位");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "sign-in") {
        await onSignIn(email.trim(), password);
        toast.success("登录成功");
      } else {
        const result = await onSignUp(email.trim(), password);
        if (result.needsEmailConfirmation) {
          toast.success("注册成功，请查收验证邮件后登录");
          setMode("sign-in");
        } else {
          toast.success("注册成功");
        }
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error, mode));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-md items-center bg-background px-page py-[max(2rem,env(safe-area-inset-top))]">
      <div className="w-full">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-card bg-primary text-primary-foreground shadow-primary">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">夜班巡检</h1>
          <p className="mt-2 text-body text-muted-foreground">
            登录后，在不同设备间安全同步巡检内容。
          </p>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="mb-5 grid h-11 grid-cols-2 rounded-navigation bg-muted p-1">
              {(["sign-in", "sign-up"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-navigation-item text-body font-bold transition ${mode === item ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}
                >
                  {item === "sign-in" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
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

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-caption font-bold text-muted-foreground">
                  <LockKeyhole className="size-4" /> 密码
                </span>
                <input
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 8 位"
                  className="min-h-12 w-full rounded-control border border-border bg-card px-4 text-body shadow-card outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </label>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "请稍候…"
                  : mode === "sign-in"
                    ? "登录"
                    : "创建账号"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function getAuthErrorMessage(
  error: unknown,
  mode: "sign-in" | "sign-up",
) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid login credentials")) return "邮箱或密码不正确";
  if (message.includes("already registered")) return "这个邮箱已经注册";
  if (message.includes("email rate limit")) return "邮件发送过于频繁，请稍后再试";
  if (message.includes("password")) return "密码不符合安全要求";
  return mode === "sign-in" ? "登录失败，请稍后重试" : "注册失败，请稍后重试";
}
