import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  GripVertical,
  KeyRound,
  LogOut,
  RotateCcw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { INSPECTION_TABS } from "@/features/inspection/model/config";
import type { InspectionTab } from "@/features/inspection/model/types";
import { DEFAULT_NAVIGATION_ORDER } from "../model/user-preferences";
import type { AccountDialogProps } from "./account-dialog-types";

const TAB_LABELS = Object.fromEntries(INSPECTION_TABS) as Record<
  InspectionTab,
  string
>;

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
  const draftOrderRef = useRef(navigationOrder);
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
    draftOrderRef.current = order;
    setDraftOrder(order);
  };

  const commitOrder = async () => {
    const next = draftOrderRef.current;
    if (next.every((tab, index) => navigationOrder[index] === tab)) return;
    await onNavigationOrderChange(next);
  };

  const resetOrder = async () => {
    const next = [...DEFAULT_NAVIGATION_ORDER];
    draftOrderRef.current = next;
    setDraftOrder(next);
    await onNavigationOrderChange(next);
    toast.success("已恢复默认导航顺序");
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

      <section className="mt-4">
        <div className="mb-2 flex min-h-9 items-center justify-between px-1">
          <div>
            <p className="text-caption font-bold text-muted-foreground">
              导航顺序
            </p>
            <p className="mt-0.5 text-label text-subtle-foreground">
              长按左侧图标拖动，第一项为启动页面
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="compact"
            onClick={() => void resetOrder()}
          >
            <RotateCcw className="size-3.5" />
            恢复默认
          </Button>
        </div>
        <Reorder.Group
          axis="y"
          values={draftOrder}
          onReorder={updateOrder}
          className="space-y-2"
        >
          {draftOrder.map((tab, index) => (
            <NavigationReorderItem
              key={tab}
              tab={tab}
              index={index}
              onCommit={() => void commitOrder()}
            />
          ))}
        </Reorder.Group>
      </section>

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

function NavigationReorderItem({
  tab,
  index,
  onCommit,
}: {
  tab: InspectionTab;
  index: number;
  onCommit: () => void;
}) {
  const dragControls = useDragControls();
  const handleRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const pressStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return clearLongPress;

    const preventScrollAfterActivation = (event: TouchEvent) => {
      if (draggingRef.current) event.preventDefault();
    };

    handle.addEventListener("touchmove", preventScrollAfterActivation, {
      passive: false,
    });

    return () => {
      clearLongPress();
      handle.removeEventListener("touchmove", preventScrollAfterActivation);
    };
  }, []);

  const startLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearLongPress();
    pressStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      pressStart.current = null;
      draggingRef.current = true;
      setDragging(true);
      dragControls.start(event, { distanceThreshold: 0 });
      navigator.vibrate?.(8);
    }, 350);
  };

  const moveLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pressStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.hypot(x, y) <= 8) return;

    clearLongPress();
    pressStart.current = null;
  };

  const finishLongPress = () => {
    clearLongPress();
    pressStart.current = null;
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
  };

  return (
    <Reorder.Item
      value={tab}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => {
        draggingRef.current = true;
        setDragging(true);
      }}
      onDragEnd={() => {
        draggingRef.current = false;
        setDragging(false);
        onCommit();
      }}
      whileDrag={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 460, damping: 34 }}
      className={`flex min-h-12 touch-pan-y select-none items-center gap-1 rounded-control px-2 pr-4 transition-colors ${
        dragging
          ? "relative z-10 bg-card shadow-floating"
          : "bg-muted shadow-card"
      }`}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`长按移动${TAB_LABELS[tab]}`}
        onPointerDown={startLongPress}
        onPointerMove={moveLongPress}
        onPointerUp={finishLongPress}
        onPointerCancel={finishLongPress}
        onContextMenu={(event) => event.preventDefault()}
        className={`grid size-10 shrink-0 place-items-center rounded-small text-subtle-foreground active:bg-border/60 ${
          dragging ? "touch-none" : "touch-pan-y"
        }`}
      >
        <GripVertical className="size-5" />
      </button>
      <span className="flex-1 font-bold">{TAB_LABELS[tab]}</span>
      {index === 0 && (
        <span className="rounded-full bg-secondary px-2 py-1 text-label font-bold text-secondary-foreground">
          启动
        </span>
      )}
    </Reorder.Item>
  );
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
