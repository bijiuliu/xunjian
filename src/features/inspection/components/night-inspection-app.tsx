"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSPECTION_TABS } from "../model/config";
import { useInspectionController } from "../hooks/use-inspection-controller";
import { BeltArea } from "./belt/belt-area";
import { BackupDialog } from "./dialogs/backup-dialog";
import { DeleteDialog } from "./dialogs/delete-dialog";
import { SaveValidationDialog } from "./dialogs/save-validation-dialog";
import { HistoryView } from "./history/history-view";
import { PumpArea } from "./pump/pump-area";

export function NightInspectionApp() {
  const reduceMotion = useReducedMotion();
  const { state, actions } = useInspectionController();

  const content =
    state.tab === "slag8" ? (
      <PumpArea
        area="slag8"
        values={state.values}
        onValueChange={actions.updateValue}
        onSelectPump={actions.choosePump}
        onClearPump={actions.clearPump}
      />
    ) : state.tab === "slag9" ? (
      <PumpArea
        area="slag9"
        values={state.values}
        onValueChange={actions.updateValue}
        onSelectPump={actions.choosePump}
        onClearPump={actions.clearPump}
      />
    ) : state.tab === "belt" ? (
      <BeltArea
        beltTab={state.beltTab}
        values={state.values}
        onSelectBelt={actions.setBeltTab}
        onValueChange={actions.updateValue}
        onClearItem={actions.clearBeltItem}
      />
    ) : (
      <HistoryView
        records={state.records}
        selectedRecord={state.selectedRecord}
        direction={state.historyDirection}
        manageHistory={state.manageHistory}
        selectedRecordIds={state.selectedRecordIds}
        reduceMotion={Boolean(reduceMotion)}
        onSelectRecord={actions.selectRecord}
        onReturnToList={actions.returnToHistoryList}
        onToggleManage={actions.toggleHistoryManagement}
        onToggleRecord={actions.toggleRecord}
        onDeleteRequest={actions.setDeleteRequest}
        onOpenBackup={actions.openBackup}
      />
    );

  return (
    <main className="mx-auto min-h-svh max-w-md bg-background px-page pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="rounded-sheet bg-gradient-to-br from-header-start via-header-middle to-header-end p-5 text-primary-foreground shadow-floating ring-1 ring-white/10">
        <h1 className="text-3xl font-black tracking-tight">夜班巡检</h1>
        <p className="mt-1 text-body text-header-muted">
          把每一次巡检，清晰留在当下。
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="inverse" onClick={actions.createNewInspection}>
            新建
          </Button>
          <Button onClick={actions.save}>
            <Save />
            保存
          </Button>
        </div>
      </header>

      <nav className="sticky top-[max(0.75rem,env(safe-area-inset-top))] z-20 my-5 grid h-11 grid-cols-4 rounded-navigation bg-card/95 p-1 shadow-card ring-1 ring-inset ring-border/70 backdrop-blur">
        {INSPECTION_TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={state.tab === id ? "page" : undefined}
            onClick={() => actions.selectTab(id)}
            className={`segmented-item relative h-full rounded-navigation-item py-0 text-caption font-bold transition duration-200 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${state.tab === id ? "bg-primary text-primary-foreground shadow-card" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.section
          key={state.tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {content}
        </motion.section>
      </AnimatePresence>

      <AnimatePresence>
        {state.saveValidation && (
          <SaveValidationDialog
            validation={state.saveValidation}
            onSave={actions.commitSave}
            onCancel={actions.cancelSaveValidation}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {state.deleteRequest && (
          <DeleteDialog
            request={state.deleteRequest}
            onConfirm={actions.confirmDeleteRecords}
            onCancel={actions.cancelDeleteRequest}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {state.backupOpen && (
          <BackupDialog
            recordCount={state.records.length}
            lastBackupAt={state.lastBackupAt}
            importPreview={state.importPreview}
            canUndoImport={state.canUndoImport}
            onExport={actions.exportBackup}
            onImportFile={actions.previewImportFile}
            onMergeImport={actions.mergeImport}
            onReplaceImport={actions.replaceImport}
            onCancelPreview={actions.cancelImportPreview}
            onUndoImport={actions.undoImport}
            onClose={actions.closeBackup}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
