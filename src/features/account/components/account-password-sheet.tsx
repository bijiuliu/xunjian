import { useState, type FormEvent } from "react";
import { motion, useIsPresent } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/features/auth";
import type { AccountDialogProps } from "./account-dialog-types";

export function AccountPasswordSheet({
  onChangePassword,
  onClose,
}: Pick<AccountDialogProps, "onChangePassword"> & { onClose: () => void }) {
  const isPresent = useIsPresent();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentPassword) {
      setError("请输入当前密码");
      return;
    }
    if (password.length < 8) {
      setError("密码至少需要 8 位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password === currentPassword) {
      setError("新密码不能与当前密码相同");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onChangePassword(currentPassword, password);
      toast.success("密码已修改，其他设备已退出");
      onClose();
    } catch (caught) {
      setError(getChangePasswordError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-overlay/35 px-page pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => {
        event.stopPropagation();
        if (!submitting) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
        aria-hidden={!isPresent}
        className="max-h-[calc(100svh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-sheet border border-border/80 bg-card p-4 text-card-foreground shadow-floating"
        style={{ pointerEvents: isPresent ? "auto" : "none" }}
        initial={{ y: 20, opacity: 0.8, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 460, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3
              id="password-dialog-title"
              className="text-lg font-black text-foreground-strong"
            >
              修改密码
            </h3>
            <p className="mt-0.5 text-caption text-muted-foreground">
              设置至少 8 位的新密码
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={submitting || !isPresent}
            onClick={onClose}
            aria-label="关闭修改密码"
          >
            <X />
          </Button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <PasswordField
            id="account-current-password"
            label="当前密码"
            autoComplete="current-password"
            value={currentPassword}
            disabled={submitting || !isPresent}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setError(null);
            }}
            placeholder="输入当前密码"
          />
          <PasswordField
            id="account-new-password"
            label="新密码"
            autoComplete="new-password"
            value={password}
            disabled={submitting || !isPresent}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            placeholder="至少 8 位"
          />
          <PasswordField
            id="account-confirm-password"
            label="确认新密码"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={submitting || !isPresent}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError(null);
            }}
            placeholder="再次输入新密码"
          />
          {error && (
            <p
              role="alert"
              className="rounded-small bg-destructive-soft px-3 py-2 text-caption font-semibold text-destructive"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={submitting || !isPresent}
            className="w-full"
          >
            <ShieldCheck />
            {submitting ? "正在保存…" : "保存新密码"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function getChangePasswordError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "invalid_credentials" || code === "invalid_password") {
      return "当前密码不正确";
    }
    if (code === "same_password") return "新密码不能与当前密码相同";
  }
  return "密码修改失败，请稍后重试";
}
