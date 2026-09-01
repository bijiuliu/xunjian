import { motion, useIsPresent } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ConfirmationAction } from "./account-dialog-types";

export function AccountConfirmationSheet({
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
  const isPresent = useIsPresent();
  const isAvatarRemoval = action === "remove-avatar";

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-overlay/35 px-page pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => {
        event.stopPropagation();
        if (!submitting) onCancel();
      }}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-confirmation-title"
        aria-hidden={!isPresent}
        className="w-full max-w-sm rounded-sheet border border-border/80 bg-card p-4 text-card-foreground shadow-floating"
        style={{ pointerEvents: isPresent ? "auto" : "none" }}
        initial={{ y: 20, opacity: 0.8, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 460, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="account-confirmation-title"
          className="text-card-title font-black text-foreground-strong"
        >
          {isAvatarRemoval ? "确认移除头像" : "确认退出登录"}
        </h3>
        <p className="mt-2 text-caption text-muted-foreground">
          {isAvatarRemoval
            ? "移除后将恢复为默认头像。"
            : "退出后需要再次输入账号和密码才能使用云端同步。"}
        </p>
        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting || !isPresent}
            onClick={onCancel}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting || !isPresent}
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
      </motion.div>
    </motion.div>
  );
}
