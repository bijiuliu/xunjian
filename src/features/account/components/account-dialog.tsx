"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { toast } from "sonner";
import { AccountConfirmationSheet } from "./account-confirmation-sheet";
import type {
  AccountDialogProps,
  ConfirmationAction,
} from "./account-dialog-types";
import { AccountMenu } from "./account-menu";
import { AccountPasswordSheet } from "./account-password-sheet";

export function AccountDialog(props: AccountDialogProps) {
  const isPresent = useIsPresent();
  const [confirmation, setConfirmation] =
    useState<ConfirmationAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (!isPresent) return;

    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const previousStyles = {
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      right: bodyStyle.right,
      width: bodyStyle.width,
      overflow: bodyStyle.overflow,
    };

    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.overflow = "hidden";

    return () => {
      bodyStyle.position = previousStyles.position;
      bodyStyle.top = previousStyles.top;
      bodyStyle.left = previousStyles.left;
      bodyStyle.right = previousStyles.right;
      bodyStyle.width = previousStyles.width;
      bodyStyle.overflow = previousStyles.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isPresent]);

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
        layoutScroll
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        aria-hidden={!isPresent}
        className="max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-sheet border border-border/80 bg-card p-4 text-card-foreground shadow-floating"
        style={{ pointerEvents: isPresent ? "auto" : "none" }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
      >
        <AccountMenu
          email={props.email}
          emailVerified={props.emailVerified}
          avatarUrl={props.avatarUrl}
          avatarBusy={props.avatarBusy}
          navigationOrder={props.navigationOrder}
          onAvatarChange={props.onAvatarChange}
          onNavigationOrderChange={props.onNavigationOrderChange}
          onClose={props.onClose}
          onOpenPassword={() => setPasswordOpen(true)}
          onRequestAvatarRemoval={() => setConfirmation("remove-avatar")}
          onRequestSignOut={() => setConfirmation("sign-out")}
        />
      </motion.div>

      <AnimatePresence>
        {confirmation && (
          <AccountConfirmationSheet
            action={confirmation}
            submitting={confirming}
            onCancel={() => setConfirmation(null)}
            onConfirm={() => void confirmAction()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {passwordOpen && (
          <AccountPasswordSheet
            onChangePassword={props.onChangePassword}
            onClose={() => setPasswordOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
