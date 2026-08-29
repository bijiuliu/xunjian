"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  CircleCheck,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordField } from "./password-field";
import {
  getAuthErrorCode,
  getAuthErrorMessage,
} from "../model/auth-errors";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  type AuthFieldErrors,
} from "../model/auth-validation";

type AuthMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password";

type AuthNotice = "confirmation-sent" | null;

type AuthScreenProps = {
  passwordRecovery?: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (
    email: string,
    password: string,
  ) => Promise<{
    needsEmailConfirmation: boolean;
    alreadyRegistered: boolean;
  }>;
  onResendSignUpConfirmation: (email: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<void>;
};

export function AuthScreen({
  passwordRecovery = false,
  onSignIn,
  onSignUp,
  onResendSignUpConfirmation,
  onRequestPasswordReset,
  onUpdatePassword,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(
    passwordRecovery ? "reset-password" : "sign-in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<AuthNotice>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [emailShakeKey, setEmailShakeKey] = useState(0);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showResendAction, setShowResendAction] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const changeMode = (nextMode: AuthMode) => {
    if (submitting || resending) return;
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setNotice(null);
    setAlreadyRegistered(false);
    setResetEmailSent(false);
    setFieldErrors({});
    setFormError(null);
    setShowResendAction(false);
  };

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  const showAlreadyRegistered = () => {
    setAlreadyRegistered(true);
    setFieldErrors((current) => ({
      ...current,
      email: "该邮箱已注册",
    }));
    setPassword("");
    setConfirmPassword("");
    setEmailShakeKey((current) => current + 1);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setShowResendAction(false);

    const nextErrors: AuthFieldErrors = {};
    if (mode !== "reset-password") {
      nextErrors.email = validateEmail(email) ?? undefined;
    }
    if (mode !== "forgot-password") {
      nextErrors.password = validatePassword(password) ?? undefined;
    }
    if (mode === "sign-up" || mode === "reset-password") {
      nextErrors.confirmPassword =
        validatePasswordConfirmation(password, confirmPassword) ?? undefined;
    }
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const normalizedEmail = normalizeEmail(email);
    setSubmitting(true);
    try {
      if (mode === "sign-in") {
        await onSignIn(normalizedEmail, password);
        toast.success("登录成功");
      } else if (mode === "sign-up") {
        const result = await onSignUp(normalizedEmail, password);
        if (result.alreadyRegistered) {
          showAlreadyRegistered();
        } else if (result.needsEmailConfirmation) {
          setNotice("confirmation-sent");
          setResendCooldown(60);
        } else {
          toast.success("注册成功");
        }
      } else if (mode === "forgot-password") {
        await onRequestPasswordReset(normalizedEmail);
        setResetEmailSent(true);
      } else {
        await onUpdatePassword(password);
        toast.success("密码已更新");
      }
    } catch (error) {
      const code = getAuthErrorCode(error);
      if (
        mode === "sign-up" &&
        (code === "user_already_exists" || code === "email_exists")
      ) {
        showAlreadyRegistered();
      } else {
        setFormError(getAuthErrorMessage(error, mode));
        setShowResendAction(mode === "sign-in" && code === "email_not_confirmed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resendConfirmation = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors((current) => ({ ...current, email: emailError }));
      return;
    }
    if (resendCooldown > 0) return;

    setResending(true);
    setFormError(null);
    try {
      await onResendSignUpConfirmation(normalizeEmail(email));
      setResendCooldown(60);
      toast.success("验证邮件已重新发送");
    } catch (error) {
      setFormError(getAuthErrorMessage(error, "resend-confirmation"));
    } finally {
      setResending(false);
    }
  };

  const accountMode = mode === "sign-in" || mode === "sign-up";
  const formDisabled = submitting || resending;

  return (
    <main className="mx-auto flex min-h-svh max-w-md items-start bg-background px-page py-[max(2rem,env(safe-area-inset-top))]">
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
                ? "设置一个至少 8 位的新密码。"
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
                    disabled={formDisabled}
                    onClick={() => changeMode(item)}
                    className={`segmented-item rounded-navigation-item text-body font-bold transition disabled:opacity-45 ${mode === item ? "bg-card text-foreground shadow-card" : "text-muted-foreground"}`}
                  >
                    {item === "sign-in" ? "登录" : "注册"}
                  </button>
                ))}
              </div>
            ) : mode === "forgot-password" ? (
              <Button
                type="button"
                variant="ghost"
                disabled={formDisabled}
                onClick={() => changeMode("sign-in")}
                className="-ml-3 mb-3 px-3"
              >
                <ArrowLeft /> 返回登录
              </Button>
            ) : null}

            {notice ? (
              <AccountNotice
                email={normalizeEmail(email)}
                resending={resending}
                resendCooldown={resendCooldown}
                formError={formError}
                onResend={resendConfirmation}
                onSignIn={() => changeMode("sign-in")}
              />
            ) : resetEmailSent ? (
              <StatusPanel
                icon={<CircleCheck className="size-6" />}
                title="请查收重置邮件"
                description="如果该邮箱已注册，你会收到密码重置链接。没有收到时，请检查垃圾邮件或稍后重试。"
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => changeMode("sign-in")}
                  className="mt-5 w-full"
                >
                  返回登录
                </Button>
              </StatusPanel>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-4">
                {mode !== "reset-password" && (
                  <EmailField
                    value={email}
                    error={fieldErrors.email}
                    shake={alreadyRegistered}
                    shakeKey={emailShakeKey}
                    showForgotPassword={mode === "sign-up" && alreadyRegistered}
                    disabled={formDisabled}
                    onChange={(value) => {
                      setEmail(value);
                      setAlreadyRegistered(false);
                      clearFieldError("email");
                    }}
                    onForgotPassword={() => changeMode("forgot-password")}
                  />
                )}

                {mode !== "forgot-password" && (
                  <PasswordField
                    key={`auth-password-${mode}`}
                    id="auth-password"
                    label={mode === "reset-password" ? "新密码" : "密码"}
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    required
                    minLength={8}
                    value={password}
                    disabled={formDisabled}
                    error={fieldErrors.password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearFieldError("password");
                    }}
                    placeholder="至少 8 位"
                    belowAction={
                      mode === "sign-in" ? (
                        <button
                          type="button"
                          disabled={formDisabled}
                          onClick={() => changeMode("forgot-password")}
                          className="-mr-2 flex min-h-11 items-center px-2 text-caption font-bold text-primary disabled:opacity-45"
                        >
                          忘记密码？
                        </button>
                      ) : undefined
                    }
                  />
                )}

                {(mode === "sign-up" || mode === "reset-password") && (
                  <PasswordField
                    id="auth-confirm-password"
                    label={mode === "reset-password" ? "确认新密码" : "确认密码"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    disabled={formDisabled}
                    error={fieldErrors.confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      clearFieldError("confirmPassword");
                    }}
                    placeholder={
                      mode === "reset-password" ? "再次输入新密码" : "再次输入密码"
                    }
                  />
                )}

                {mode === "sign-up" && !fieldErrors.password && (
                  <p className="-mt-1 text-caption text-muted-foreground">
                    密码至少 8 位，两次输入需保持一致。
                  </p>
                )}

                {formError && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-small bg-destructive-soft px-3 py-2 text-caption font-semibold text-destructive"
                  >
                    <p>{formError}</p>
                    {showResendAction && (
                      <button
                        type="button"
                        disabled={resending || resendCooldown > 0}
                        onClick={resendConfirmation}
                        className="mt-1 min-h-11 text-primary disabled:text-muted-foreground"
                      >
                        {resending
                          ? "正在发送…"
                          : resendCooldown > 0
                            ? `${resendCooldown} 秒后可重发`
                            : "重新发送验证邮件"}
                      </button>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={formDisabled}>
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

type EmailFieldProps = {
  value: string;
  error?: string;
  shake: boolean;
  shakeKey: number;
  showForgotPassword: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onForgotPassword: () => void;
};

function EmailField({
  value,
  error,
  shake,
  shakeKey,
  showForgotPassword,
  disabled,
  onChange,
  onForgotPassword,
}: EmailFieldProps) {
  return (
    <div>
      <label className="block" htmlFor="auth-email">
        <span className="mb-2 flex min-h-5 items-center gap-2 text-caption font-bold text-muted-foreground">
          <Mail className="size-4" /> 邮箱
        </span>
        <span
          key={shakeKey}
          className={shake ? "auth-email-shake block" : "block"}
        >
          <input
            id="auth-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            spellCheck={false}
            required
            value={value}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "auth-email-error" : undefined}
            onChange={(event) => onChange(event.target.value)}
            placeholder="name@example.com"
            className={`min-h-12 w-full rounded-control border bg-card px-4 text-base shadow-card outline-none transition focus:ring-4 focus:ring-primary/15 disabled:opacity-45 ${error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"}`}
          />
        </span>
      </label>
      {error && showForgotPassword ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-11 items-center justify-between gap-3"
        >
          <span
            id="auth-email-error"
            className="text-caption font-semibold text-destructive"
          >
            {error}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={onForgotPassword}
            className="flex min-h-11 shrink-0 items-center text-caption font-bold text-primary disabled:opacity-45"
          >
            忘记密码？
          </button>
        </div>
      ) : error ? (
        <span
          id="auth-email-error"
          className="mt-1.5 block text-caption font-semibold text-destructive"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}

type AccountNoticeProps = {
  email: string;
  resending: boolean;
  resendCooldown: number;
  formError: string | null;
  onResend: () => void;
  onSignIn: () => void;
};

function AccountNotice({
  email,
  resending,
  resendCooldown,
  formError,
  onResend,
  onSignIn,
}: AccountNoticeProps) {
  return (
    <StatusPanel
      icon={<CircleCheck className="size-6" />}
      title="请验证邮箱"
      description={`验证邮件已发送至 ${email}。完成验证后即可登录。`}
    >
      {formError && (
        <p
          role="alert"
          className="mt-4 rounded-small bg-destructive-soft px-3 py-2 text-caption font-semibold text-destructive"
        >
          {formError}
        </p>
      )}
      <div className="mt-5 grid gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={resending || resendCooldown > 0}
          onClick={onResend}
          className="w-full"
        >
          {resending
            ? "正在发送…"
            : resendCooldown > 0
              ? `${resendCooldown} 秒后可重发`
              : "重新发送验证邮件"}
        </Button>
        <Button type="button" variant="ghost" onClick={onSignIn} className="w-full">
          返回登录
        </Button>
      </div>
    </StatusPanel>
  );
}

type StatusPanelProps = {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
};

function StatusPanel({ icon, title, description, children }: StatusPanelProps) {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
        {icon}
      </div>
      <h2 className="mt-4 text-card-title font-bold">{title}</h2>
      <p className="mt-2 break-words text-body leading-6 text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}
