import type { FormEventHandler } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthFieldErrors } from "../model/auth-validation";
import { PasswordField } from "./password-field";
import type { AuthMode } from "./auth-screen-types";

type AuthFormProps = {
  mode: AuthMode;
  email: string;
  password: string;
  confirmPassword: string;
  alreadyRegistered: boolean;
  emailShakeKey: number;
  fieldErrors: AuthFieldErrors;
  formError: string | null;
  showResendAction: boolean;
  submitting: boolean;
  resending: boolean;
  resendCooldown: number;
  disabled: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onForgotPassword: () => void;
  onResendConfirmation: () => void;
};

export function AuthForm({
  mode,
  email,
  password,
  confirmPassword,
  alreadyRegistered,
  emailShakeKey,
  fieldErrors,
  formError,
  showResendAction,
  submitting,
  resending,
  resendCooldown,
  disabled,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onForgotPassword,
  onResendConfirmation,
}: AuthFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {mode !== "reset-password" && (
        <EmailField
          value={email}
          error={fieldErrors.email}
          shake={alreadyRegistered}
          shakeKey={emailShakeKey}
          showForgotPassword={mode === "sign-up" && alreadyRegistered}
          disabled={disabled}
          onChange={onEmailChange}
          onForgotPassword={onForgotPassword}
        />
      )}

      {mode !== "forgot-password" && (
        <PasswordField
          key={`auth-password-${mode}`}
          id="auth-password"
          label={mode === "reset-password" ? "新密码" : "密码"}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
          minLength={8}
          value={password}
          disabled={disabled}
          error={fieldErrors.password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="至少 8 位"
          belowAction={
            mode === "sign-in" ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onForgotPassword}
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
          disabled={disabled}
          error={fieldErrors.confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
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
              onClick={onResendConfirmation}
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

      <Button type="submit" className="w-full" disabled={disabled}>
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
  );
}

function EmailField({
  value,
  error,
  shake,
  shakeKey,
  showForgotPassword,
  disabled,
  onChange,
  onForgotPassword,
}: {
  value: string;
  error?: string;
  shake: boolean;
  shakeKey: number;
  showForgotPassword: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onForgotPassword: () => void;
}) {
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
