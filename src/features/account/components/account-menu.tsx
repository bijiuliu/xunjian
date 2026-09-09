import { useRef } from "react";
import {
  Camera,
  CheckCircle2,
  KeyRound,
  LogOut,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AccountDialogProps } from "./account-dialog-types";
import { AvatarVisual } from "./avatar-visual";
import { NavigationOrderEditor } from "./navigation-order-editor";

type AccountMenuProps = Pick<
  AccountDialogProps,
  | "email"
  | "emailVerified"
  | "avatarUrl"
  | "avatarBusy"
  | "navigationOrder"
  | "onAvatarChange"
  | "onNavigationOrderChange"
  | "onClose"
> & {
  onOpenPassword: () => void;
  onRequestAvatarRemoval: () => void;
  onRequestSignOut: () => void;
};

export function AccountMenu({
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
}: AccountMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const chooseAvatar = async (file: File) => {
    try {
      await onAvatarChange(file);
      toast.success("头像已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "头像更新失败");
    }
  };

  return (
    <>
      <div className="pointer-events-none sticky top-0 z-20 flex h-0 justify-end px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="关闭账号面板"
          className="pointer-events-auto"
        >
          <X />
        </Button>
      </div>
      <div className="px-1 pb-3">
        <h3
          id="account-dialog-title"
          className="text-lg font-black text-foreground-strong"
        >
          账号
        </h3>
        <p className="mt-0.5 text-caption text-muted-foreground">
          个人资料与使用偏好
        </p>
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
        <p className="mt-3 truncate text-card-title font-bold text-foreground">
          {email}
        </p>
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
        <p className="mb-2 px-1 text-caption font-bold text-muted-foreground">
          账号安全
        </p>
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

      <NavigationOrderEditor
        navigationOrder={navigationOrder}
        onNavigationOrderChange={onNavigationOrderChange}
      />

      <Button
        type="button"
        variant="destructive"
        onClick={onRequestSignOut}
        className="mt-5 w-full"
      >
        <LogOut />
        退出登录
      </Button>
    </>
  );
}
