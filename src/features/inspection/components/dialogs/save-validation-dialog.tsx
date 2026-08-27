import { motion, useIsPresent } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveValidation } from "../../model/types";

type SaveValidationDialogProps = {
  validation: SaveValidation;
  onSave: () => void;
  onCancel: () => void;
};

export function SaveValidationDialog({
  validation,
  onSave,
  onCancel,
}: SaveValidationDialogProps) {
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
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-validation-title"
        aria-hidden={!isPresent}
        className="w-full max-w-md rounded-sheet border border-border/80 bg-card p-4 text-card-foreground shadow-floating"
        style={{ pointerEvents: isPresent ? "auto" : "none" }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-1 pb-3 pt-1">
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-warning-soft text-warning">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h3
              id="save-validation-title"
              className="text-lg font-black text-foreground-strong"
            >
              记录尚未填写完整
            </h3>
            <p className="mt-1 text-body text-muted-foreground">
              请检查以下内容，是否仍要保存？
            </p>
          </div>
        </div>
        <div className="max-h-[46svh] space-y-3 overflow-y-auto py-1">
          {validation.unselectedPumps.length > 0 && (
            <MissingGroup
              title="未选择泵号"
              items={validation.unselectedPumps}
              tone="amber"
            />
          )}
          {validation.emptyInputs.length > 0 && (
            <MissingGroup
              title="未填写数值"
              items={validation.emptyInputs}
              tone="rose"
            />
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={!isPresent}
            onClick={onSave}
            className="bg-muted text-foreground"
          >
            仍然保存
          </Button>
          <Button type="button" disabled={!isPresent} onClick={onCancel}>
            返回补充
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MissingGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "amber" | "rose";
}) {
  return (
    <section
      className={`rounded-small p-3 ${tone === "amber" ? "bg-warning-soft" : "bg-destructive-soft"}`}
    >
      <div className="flex items-center justify-between">
        <b
          className={`text-body ${tone === "amber" ? "text-warning" : "text-destructive"}`}
        >
          {title}
        </b>
        <span
          className={`rounded-full bg-card/80 px-2 py-0.5 text-caption ${tone === "amber" ? "text-warning" : "text-destructive"}`}
        >
          {items.length} 项
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            className="flex gap-2 text-caption leading-5 text-muted-foreground"
            key={item}
          >
            <span className="shrink-0 text-border">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
