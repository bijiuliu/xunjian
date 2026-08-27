import { motion, useIsPresent } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeleteRequest } from "../../model/types";

type DeleteDialogProps = {
  request: DeleteRequest;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteDialog({
  request,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay px-page pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <DeleteDialogPanel
        request={request}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </motion.div>
  );
}

function DeleteDialogPanel({
  request,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-hidden={!isPresent}
      className="w-full max-w-md rounded-sheet border border-border/80 bg-card p-4 text-card-foreground shadow-floating"
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="px-2 pb-4 pt-1 text-center">
        <h3 id="delete-title" className="text-lg font-black text-foreground-strong">
          确认删除？
        </h3>
        <p className="mt-1 text-body text-muted-foreground">{request.label}</p>
      </div>
      <Button
        type="button"
        variant="destructive"
        disabled={!isPresent}
        onClick={onConfirm}
        className="w-full"
      >
        <Trash2 size={17} />
        确认删除
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={!isPresent}
        onClick={onCancel}
        className="mt-2 w-full"
      >
        取消
      </Button>
    </motion.div>
  );
}
