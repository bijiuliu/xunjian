import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStickyEdgeState } from "../../hooks/use-sticky-edge-state";
import { Card, CardContent } from "@/components/ui/card";
import type { DeleteRequest, InspectionRecord } from "../../model/types";
import { InspectionSummary } from "./inspection-summary";

const HISTORY_VIEW_VARIANTS = {
  initial: (direction: 1 | -1) => ({
    opacity: 0,
    x: direction === 1 ? 18 : -18,
  }),
  animate: { opacity: 1, x: 0 },
  exit: (direction: 1 | -1) => ({
    opacity: 0,
    x: direction === 1 ? -14 : 18,
  }),
};

const HISTORY_VIEW_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1] as const,
};

type HistoryViewProps = {
  records: InspectionRecord[];
  selectedRecord: InspectionRecord | null;
  direction: 1 | -1;
  manageHistory: boolean;
  selectedRecordIds: string[];
  reduceMotion: boolean;
  onSelectRecord: (record: InspectionRecord) => void;
  onReturnToList: () => void;
  onToggleManage: () => void;
  onToggleRecord: (id: string) => void;
  onDeleteRequest: (request: DeleteRequest) => void;
};

export function HistoryView({
  records,
  selectedRecord,
  direction,
  manageHistory,
  selectedRecordIds,
  reduceMotion,
  onSelectRecord,
  onReturnToList,
  onToggleManage,
  onToggleRecord,
  onDeleteRequest,
}: HistoryViewProps) {
  return (
    <>
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        <motion.div
          key={selectedRecord ? `detail-${selectedRecord.id}` : "list"}
          custom={direction}
          variants={HISTORY_VIEW_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : HISTORY_VIEW_TRANSITION}
        >
          {selectedRecord ? (
            <InspectionSummary record={selectedRecord} />
          ) : (
            <HistoryList
              records={records}
              manageHistory={manageHistory}
              selectedRecordIds={selectedRecordIds}
              onSelectRecord={onSelectRecord}
              onToggleManage={onToggleManage}
              onToggleRecord={onToggleRecord}
              onDeleteRequest={onDeleteRequest}
            />
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {selectedRecord && (
          <motion.div
            key={`actions-${selectedRecord.id}`}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 grid w-[calc(100%-2rem)] max-w-[416px] -translate-x-1/2 grid-cols-[1fr_auto] gap-2"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: reduceMotion
                ? { duration: 0 }
                : {
                    ...HISTORY_VIEW_TRANSITION,
                    delay: HISTORY_VIEW_TRANSITION.duration,
                  },
            }}
            exit={{
              opacity: 0,
              y: reduceMotion ? 0 : 8,
              transition: reduceMotion
                ? { duration: 0 }
                : HISTORY_VIEW_TRANSITION,
            }}
          >
            <Button type="button" onClick={onReturnToList} className="w-full">
              返回历史记录
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="iconLarge"
              aria-label="删除当前记录"
              onClick={() =>
                onDeleteRequest({
                  ids: [selectedRecord.id],
                  label: `${selectedRecord.date} ${selectedRecord.time}`,
                })
              }
              className="bg-destructive-soft text-destructive shadow-destructive"
            >
              <Trash2 size={19} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type HistoryListProps = Pick<
  HistoryViewProps,
  | "records"
  | "manageHistory"
  | "selectedRecordIds"
  | "onSelectRecord"
  | "onToggleManage"
  | "onToggleRecord"
  | "onDeleteRequest"
>;

function HistoryList({
  records,
  manageHistory,
  selectedRecordIds,
  onSelectRecord,
  onToggleManage,
  onToggleRecord,
  onDeleteRequest,
}: HistoryListProps) {
  const { elementRef: selectionActionsRef, isStuck } = useStickyEdgeState(
    manageHistory && records.length > 0,
  );

  return (
    <>
      <div className="mb-4 flex h-8 items-center justify-between px-1">
        <h2 className="text-title font-black tracking-tight">历史记录</h2>
        {records.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={onToggleManage}
            className="-mr-2 px-2 text-primary"
          >
            {manageHistory ? "完成" : "管理"}
          </Button>
        )}
      </div>
      {records.length ? (
        records.map((record) => (
          <Card className="mb-2" key={record.id}>
            <CardContent className="flex min-h-18 items-center gap-3">
              {manageHistory ? (
                <button
                  type="button"
                  onClick={() => onToggleRecord(record.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${selectedRecordIds.includes(record.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    {selectedRecordIds.includes(record.id) && (
                      <Check size={14} strokeWidth={3} />
                    )}
                  </span>
                  <RecordDate record={record} />
                </button>
              ) : (
                <>
                  <div className="flex-1">
                    <RecordDate record={record} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`查看 ${record.date} 的巡检记录`}
                    onClick={() => onSelectRecord(record)}
                    className="bg-muted text-muted-foreground"
                  >
                    <ChevronRight size={18} />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-control bg-muted text-primary">
              <History size={22} />
            </span>
            <p className="text-body font-medium">暂无历史记录</p>
          </CardContent>
        </Card>
      )}
      {manageHistory && records.length > 0 && (
        <div
          className={`history-selection-actions pointer-events-none sticky bottom-0 z-10 -mx-page mt-2 px-page pb-[max(1rem,env(safe-area-inset-bottom))] ${isStuck ? "history-selection-actions--stuck" : ""}`}
          ref={selectionActionsRef}
        >
          <div className="pointer-events-auto flex min-h-14 items-center px-1">
            <span className="text-body font-semibold text-muted-foreground">
              已选择 <b className="text-primary">{selectedRecordIds.length}</b> 条
            </span>
            <Button
              type="button"
              variant="destructive"
              disabled={selectedRecordIds.length === 0}
              onClick={() =>
                onDeleteRequest({
                  ids: selectedRecordIds,
                  label: `${selectedRecordIds.length} 条历史记录`,
                })
              }
              className="ml-auto"
            >
              <Trash2 size={16} />
              删除
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function RecordDate({ record }: { record: InspectionRecord }) {
  return (
    <span>
      <b className="block text-card-title">{record.date}</b>
      <span className="mt-1 block text-caption text-muted-foreground">
        填写时间 {record.time}
      </span>
    </span>
  );
}
