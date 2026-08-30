"use client";

import { useRef, useState } from "react";
import { motion, Reorder, useIsPresent } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  GripVertical,
  KeyRound,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/features/auth";
import { INSPECTION_TABS } from "@/features/inspection/model/config";
import type { InspectionTab } from "@/features/inspection/model/types";
import { DEFAULT_NAVIGATION_ORDER } from "../model/user-preferences";

type AccountDialogProps = {
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  avatarBusy: boolean;
  navigationOrder: InspectionTab[];
  onAvatarChange: (file: File) => Promise<void>;
  onAvatarRemove: () => Promise<void>;
  onNavigationOrderChange: (order: InspectionTab[]) => Promise<void>;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  onSignOut: () => Promise<void>;
  onClose: () => void;
};

const TAB_LABELS = Object.fromEntries(INSPECTION_TABS) as Record<
  InspectionTab,
  string
>;

type ConfirmationAction = "remove-avatar" | "sign-out";

export function AccountDialog(props: AccountDialogProps) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay px-page pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={props.onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        aria-hidden={!isPresent}
        className="max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-sheet border border-border/80 bg-card p-4 text-card-foreground shadow-floating"
        style={{ pointerEvents: isPresent ? "auto" : "none" }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
      >
        <AccountPanel {...props} />
      </motion.div>
    </motion.div>
  );
}

function AccountPanel(props: AccountDialogProps) {
  const [panel, setPanel] = useState<"account" | "password">("account");
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(null);
  const [confirming, setConfirming] = useState(false);

  const confirmAction = async () => {
    if (!confirmation) return;
    setConfirming(true);
    try {
      if (confirmation === "remove-avatar") {
        await props.onAvatarRemove();
        toast.success("头像已移除");
        setConfirmation(null);
      } else {
        await props.onSignOut();
      }
    } catch {
      toast.error(
        confirmation === "remove-avatar"
          ? "头像移除失败，请稍后重试"
          : "退出登录失败，请稍后重试",
      );
    } finally {
      setConfirming(false);
    }
  };

  if (confirmation) {
    return (
      <ConfirmationPanel
        action={confirmation}
        submitting={confirming}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void confirmAction()}
      />
    );
  }

  return panel === "password" ? (
    <PasswordPanel
      onChangePassword={props.onChangePassword}
      onBack={() => setPanel("account")}
    />
  ) : (
    <AccountMenu
      {...props}
      onOpenPassword={() => setPanel("password")}
      onRequestAvatarRemoval={() => setConfirmation("remove-avatar")}
      onRequestSignOut={() => setConfirmation("sign-out")}
    />
  );
}

function ConfirmationPanel({
  action,
  submitting,
  onCancel,
  onConfirm,
}: {
  action: ConfirmationAction;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isAvatarRemoval = action === "remove-avatar";

  return (
    <>
      <div className="px-1 pb-4">
        <h3 id="account-dialog-title" className="text-lg font-black text-foreground-strong">
          {isAvatarRemoval ? "确认移除头像" : "确认退出登录"}
        </h3>
        <p className="mt-1 text-caption text-muted-foreground">
          {isAvatarRemoval
            ? "移除后将恢复为默认头像。"
            : "退出后需要再次输入账号和密码才能使用云端同步。"}
        </p>
      </div>
      <div className="rounded-card bg-muted p-4">
        <p className="font-bold text-foreground">
          {isAvatarRemoval ? "确定要移除当前头像吗？" : "确定要退出当前账号吗？"}
        </p>
      </div>
      <div className="mt-5 flex gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={onCancel}
          className="flex-1"
        >
          取消
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={submitting}
          onClick={onConfirm}
          className="flex-1"
        >
          {submitting
            ? "正在处理…"
            : isAvatarRemoval
              ? "移除头像"
              : "退出登录"}
        </Button>
      </div>
    </>
  );
}

function AccountMenu({
  email,
  emailVerified,
  avatarUrl,
  avatarBusy,
  navigationOrder,
  onAvatarChange,
  onNavigationOrderChange,
  onClose,
  onOpenPassword,
  onRequestAvatarRemoval,
  onRequestSignOut,
}: Omit<AccountDialogProps, "onAvatarRemove" | "onSignOut"> & {
  onOpenPassword: () => void;
  onRequestAvatarRemoval: () => void;
  onRequestSignOut: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftOrder, setDraftOrder] = useState(navigationOrder);

  const chooseAvatar = async (file: File) => {
    try {
      await onAvatarChange(file);
      toast.success("头像已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "头像更新失败");
    }
  };

  const updateOrder = (order: InspectionTab[]) => {
    setDraftOrder(order);
  };

  const commitOrder = async () => {
    if (draftOrder.every((tab, index) => navigationOrder[index] === tab)) return;
    await onNavigationOrderChange(draftOrder);
  };

  const resetOrder = async () => {
    const next = [...DEFAULT_NAVIGATION_ORDER];
    setDraftOrder(next);
    await onNavigationOrderChange(next);
    toast.success("已恢复默认导航顺序");
  };

  return (
    <>
      <div className="flex items-center justify-between px-1 pb-3">
        <div>
          <h3 id="account-dialog-title" className="text-lg font-black text-foreground-strong">
            账号
          </h3>
          <p className="mt-0.5 text-caption text-muted-foreground">个人资料与使用偏好</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="关闭账号面板">
          <X />
        </Button>
      </div>

      <section className="rounded-card bg-muted p-4 text-center">
        <button
          type="button"
          disabled={avatarBusy}
          onClick={() => inputRef.current?.click()}
          className="relative mx-auto block size-20 rounded-full bg-primary text-xl font-black text-primary-foreground shadow-primary disabled:opacity-60"
          aria-label={avatarUrl ? "更换头像" : "设置头像"}
        >
          <AvatarVisual email={email} avatarUrl={avatarUrl} />
          <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-muted bg-card text-primary shadow-card">
            <Camera className="size-4" />
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void chooseAvatar(file);
            event.currentTarget.value = "";
          }}
        />
        <p className="mt-3 truncate text-card-title font-bold text-foreground">{email}</p>
        <p className="mt-1 inline-flex items-center gap-1 text-caption font-semibold text-success">
          <CheckCircle2 className="size-3.5" />
          {emailVerified ? "邮箱已验证" : "邮箱待验证"}
        </p>
        {avatarUrl && (
          <button
            type="button"
            disabled={avatarBusy}
            onClick={onRequestAvatarRemoval}
            className="mx-auto mt-2 flex min-h-11 items-center gap-1.5 px-3 text-caption font-bold text-destructive disabled:opacity-45"
          >
            <Trash2 className="size-4" />
            移除头像
          </button>
        )}
      </section>

      <section className="mt-4">
        <p className="mb-2 px-1 text-caption font-bold text-muted-foreground">账号安全</p>
        <button
          type="button"
          onClick={onOpenPassword}
          className="flex min-h-14 w-full items-center gap-3 rounded-control bg-muted px-4 text-left transition active:scale-[.98]"
        >
          <span className="grid size-9 place-items-center rounded-small bg-card text-primary shadow-card">
            <KeyRound className="size-4" />
          </span>
          <span className="font-bold">修改密码</span>
        </button>
      </section>

      <section className="mt-4">
        <div className="mb-2 flex min-h-9 items-center justify-between px-1">
          <div>
            <p className="text-caption font-bold text-muted-foreground">导航顺序</p>
            <p className="mt-0.5 text-label text-subtle-foreground">拖动排序，第一项为启动页面</p>
          </div>
          <Button type="button" variant="ghost" size="compact" onClick={() => void resetOrder()}>
            <RotateCcw className="size-3.5" />
            恢复默认
          </Button>
        </div>
        <Reorder.Group axis="y" values={draftOrder} onReorder={updateOrder} className="space-y-2">
          {draftOrder.map((tab, index) => (
            <Reorder.Item
              key={tab}
              value={tab}
              onDragEnd={() => void commitOrder()}
              className="flex min-h-12 touch-none select-none items-center gap-3 rounded-control bg-muted px-4 shadow-card"
            >
              <GripVertical className="size-5 shrink-0 text-subtle-foreground" />
              <span className="flex-1 font-bold">{TAB_LABELS[tab]}</span>
              {index === 0 && (
                <span className="rounded-full bg-secondary px-2 py-1 text-label font-bold text-secondary-foreground">
                  启动
                </span>
              )}
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </section>

      <Button type="button" variant="destructive" onClick={onRequestSignOut} className="mt-5 w-full">
        <LogOut />
        退出登录
      </Button>
    </>
  );
}

function PasswordPanel({
  onChangePassword,
  onBack,
}: Pick<AccountDialogProps, "onChangePassword"> & { onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
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
      toast.success("密码已修改");
      onBack();
    } catch (caught) {
      setError(getChangePasswordError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 pb-4">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="返回账号">
          <ChevronLeft />
        </Button>
        <div>
          <h3 id="account-dialog-title" className="text-lg font-black text-foreground-strong">
            修改密码
          </h3>
          <p className="mt-0.5 text-caption text-muted-foreground">设置至少 8 位的新密码</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <PasswordField
          id="account-current-password"
          label="当前密码"
          autoComplete="current-password"
          value={currentPassword}
          disabled={submitting}
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
          disabled={submitting}
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
          disabled={submitting}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setError(null);
          }}
          placeholder="再次输入新密码"
        />
        {error && (
          <p role="alert" className="rounded-small bg-destructive-soft px-3 py-2 text-caption font-semibold text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          <ShieldCheck />
          {submitting ? "正在保存…" : "保存新密码"}
        </Button>
      </form>
    </>
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

export function AvatarVisual({
  email,
  avatarUrl,
  tone = "default",
}: {
  email: string;
  avatarUrl: string | null;
  tone?: "default" | "header";
}) {
  if (avatarUrl) {
    return (
      <span
        role="img"
        aria-label="用户头像"
        className="block size-full rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${JSON.stringify(avatarUrl)})` }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={`${email}的默认头像`}
      className={`grid size-full place-items-center rounded-full text-muted-foreground ${tone === "header" ? "bg-border" : "bg-muted"}`}
    >
      <UserRound className="size-1/2" />
    </span>
  );
}
