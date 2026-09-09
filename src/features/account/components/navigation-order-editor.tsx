import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, RotateCcw } from "lucide-react";
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

export function NavigationOrderEditor({
  navigationOrder,
  onNavigationOrderChange,
}: Pick<AccountDialogProps, "navigationOrder" | "onNavigationOrderChange">) {
  const draftOrderRef = useRef(navigationOrder);
  const [draftOrder, setDraftOrder] = useState(navigationOrder);

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
