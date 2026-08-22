"use client";
import { type ChangeEvent, useEffect, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, ChevronRight, History, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
type Tab = "slag8" | "belt" | "slag9" | "history";
type Values = Record<string, string>;
type InspectionRecord = {
  id: string;
  date: string;
  time: string;
  values: Values;
};
type SaveValidation = {
  unselectedPumps: string[];
  emptyInputs: string[];
};
type DeleteRequest = { ids: string[]; label: string };
const areas = {
  slag8: {
    title: "8#冲渣区域",
    groups: [
      ["冲渣泵", ["101", "102", "103"]],
      ["上塔泵", ["501", "502", "503"]],
    ],
  },
  slag9: {
    title: "9#冲渣区域",
    groups: [
      ["冲渣泵", ["201", "202", "203"]],
      ["上塔泵", ["1#", "2#", "3#"]],
    ],
  },
} as const;
const belts = [
  { id: "SZ101", ends: ["东", "西"] },
  { id: "SZ201", ends: ["南", "北"] },
  { id: "SZ201-N", ends: ["南", "北"] },
];
type BeltTab = (typeof belts)[number]["id"];
type Draft = { values: Values; beltTab: BeltTab };
const items = [
  "电机 / 减速机",
  "液力耦合器",
  "头轮",
  "头增面轮",
  "配重东 / 南",
  "配重西 / 北",
  "配重",
  "中间滚筒",
  "尾轮",
];
const DRAFT_STORAGE_KEY = "night-inspection-draft";
const historyViewVariants = {
  initial: (direction: 1 | -1) => ({ opacity: 0, x: direction === 1 ? 18 : -18 }),
  animate: { opacity: 1, x: 0 },
  exit: (direction: 1 | -1) => ({ opacity: 0, x: direction === 1 ? -14 : 18 }),
};
const historyViewTransition = {
  duration: 0.14,
  ease: [0.22, 1, 0.36, 1] as const,
};
const k = (...x: string[]) => x.join("__");
const isBeltTab = (value: unknown): value is BeltTab =>
  belts.some(({ id }) => id === value);
const visibleBeltItems = (id: string) =>
  items.filter(
    (item) =>
      !(
        (["SZ101", "SZ201"].includes(id) && item === "液力耦合器") ||
        (id === "SZ201" && item === "头增面轮") ||
        (id === "SZ201-N" && item === "中间滚筒") ||
        (id === "SZ101" &&
          ["配重东 / 南", "配重西 / 北", "配重", "中间滚筒"].includes(item))
      ),
  );
const beltItemTitle = (id: string, item: string) =>
  id === "SZ101" && item === "电机 / 减速机" ? "电机" : item;
const beltPoints = (id: string, ends: string[], item: string) => {
  if (id === "SZ101" && item === "电机 / 减速机") {
    return [{ label: "电机", key: k("belt", id, item, "motor") }];
  }
  if (id === "SZ201-N" && item === "液力耦合器") {
    return [{ label: "液耦", key: k("belt", id, item, "fluid") }];
  }
  const labels =
    item === "电机 / 减速机"
      ? ["电机", "减速机"]
      : item === "配重东 / 南"
        ? ["东", "南"]
        : item === "配重西 / 北"
          ? ["西", "北"]
          : ends;
  return ends.map((end, index) => ({
    label: labels[index],
    key: k("belt", id, item, end),
  }));
};
export default function Home() {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>("slag8"),
    [beltTab, setBeltTab] = useState<BeltTab>("SZ101"),
    [values, setValues] = useState<Values>({}),
    [records, setRecords] = useState<InspectionRecord[]>([]),
    [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null),
    [historyDirection, setHistoryDirection] = useState<1 | -1>(1),
    [manageHistory, setManageHistory] = useState(false),
    [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]),
    [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null),
    [saveValidation, setSaveValidation] = useState<SaveValidation | null>(null),
    [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const loadStorage = window.setTimeout(() => {
      try {
        const storedRecords = JSON.parse(
          localStorage.getItem("night-inspection") || "[]",
        ) as unknown;
        if (Array.isArray(storedRecords)) {
          setRecords(storedRecords as InspectionRecord[]);
        }
      } catch {
        setRecords([]);
      }

      try {
        const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (storedDraft) {
          const draft = JSON.parse(storedDraft) as unknown;
          if (draft && typeof draft === "object" && "values" in draft) {
            const savedDraft = draft as Partial<Draft>;
            if (savedDraft.values) setValues(savedDraft.values);
            if (isBeltTab(savedDraft.beltTab)) setBeltTab(savedDraft.beltTab);
          } else if (draft && typeof draft === "object") {
            setValues(draft as Values);
          }
        }
      } catch {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } finally {
        setDraftReady(true);
      }
    }, 0);

    return () => window.clearTimeout(loadStorage);
  }, []);
  useEffect(() => {
    if (draftReady) localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ values, beltTab }));
  }, [beltTab, draftReady, values]);
  const put = (n: string, v: string) => setValues((x) => ({ ...x, [n]: v }));
  const status = (n: string) => (
    <Button
      type="button"
      size="icon"
      variant={values[n] === "✕" ? "ghost" : "secondary"}
      aria-label={values[n] === "✕" ? "标记为正常" : "标记为异常"}
      onClick={() => put(n, values[n] === "✕" ? "✓" : "✕")}
      className={values[n] === "✕" ? "bg-destructive-soft text-destructive" : undefined}
    >
      {values[n] === "✕" ? <X size={19} strokeWidth={2.5} /> : <Check size={19} strokeWidth={2.5} />}
    </Button>
  );
  const numericInput = (n: string) => ({
    inputMode: "numeric" as const,
    maxLength: 2,
    value: values[n] || "",
    onChange: (e: ChangeEvent<HTMLInputElement>) => put(n, e.target.value),
  });
  const field = (l: string, n: string) => (
    <label className="rounded-control bg-muted p-2.5 ring-1 ring-transparent transition focus-within:bg-card focus-within:ring-primary/25 focus-within:shadow-card">
      <span className="block text-label font-medium text-muted-foreground">{l}</span>
      <input
        {...numericInput(n)}
        className="mt-1 w-full bg-transparent text-xl font-bold outline-none"
      />
    </label>
  );
  const beltField = (l: string, n: string) => (
    <label className="rounded-control bg-muted px-3 py-2.5 text-center ring-1 ring-transparent transition focus-within:bg-card focus-within:ring-primary/25 focus-within:shadow-card">
      <span className="block text-label font-medium text-muted-foreground">{l}</span>
      <input
        {...numericInput(n)}
        className="mt-1 w-full bg-transparent text-center text-lg font-bold outline-none"
      />
    </label>
  );
  const clearKeys = (keys: string[]) => {
    setValues((current) => ({
      ...current,
      ...Object.fromEntries(keys.map((key) => [key, ""])),
    }));
  };
  const clearPump = (area: "slag8" | "slag9", name: string, index: number) => {
    clearKeys(
      ["no", "south", "north", "front", "body"].map((field) =>
        k(area, name, String(index), field),
      ),
    );
    toast.success(`已清空${area === "slag8" ? "8#" : "9#"}${name}`);
  };
  const choosePump = (
    area: "slag8" | "slag9",
    name: string,
    index: number,
    pumpNo: string,
  ) => {
    const currentKey = k(area, name, String(index), "no");
    const otherKey = k(area, name, String(1 - index), "no");
    setValues((current) => {
      const currentPump = current[currentKey] || "";
      const otherPump = current[otherKey] || "";
      if (pumpNo && pumpNo === otherPump) {
        return { ...current, [currentKey]: pumpNo, [otherKey]: currentPump };
      }
      return { ...current, [currentKey]: pumpNo };
    });
  };
  const clearBeltItem = (id: string, ends: string[], item: string) => {
    clearKeys(
      id === "SZ101" && item === "电机 / 减速机"
        ? [k("belt", id, item, "motor")]
        : id === "SZ201-N" && item === "液力耦合器"
          ? [k("belt", id, item, "fluid")]
          : ends.map((end) => k("belt", id, item, end)),
    );
    toast.success(`已清空${id} ${id === "SZ101" && item === "电机 / 减速机" ? "电机" : item}`);
  };
  const toggleRecord = (id: string) =>
    setSelectedRecordIds((current) =>
      current.includes(id)
        ? current.filter((recordId) => recordId !== id)
        : [...current, id],
    );
  const confirmDeleteRecords = () => {
    if (!deleteRequest) return;
    const deleting = new Set(deleteRequest.ids);
    const next = records.filter((record) => !deleting.has(record.id));
    localStorage.setItem("night-inspection", JSON.stringify(next));
    setRecords(next);
    if (selectedRecord && deleting.has(selectedRecord.id)) {
      setHistoryDirection(-1);
      setSelectedRecord(null);
    }
    setSelectedRecordIds([]);
    setManageHistory(false);
    setDeleteRequest(null);
    toast.success(deleteRequest.ids.length > 1 ? `已删除 ${deleteRequest.ids.length} 条记录` : "已删除历史记录");
  };
  const pump = (area: "slag8" | "slag9") => (
    <>
      <Head
        title={areas[area].title}
        caption="每组 3 台泵、两用一备；仅填写两台运行设备。"
      />
      {areas[area].groups.map(([name, ops]) => (
        <section key={name}>
          {[0, 1].map((i) => (
            <Card className="mb-3" key={i}>
              <CardContent>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <b className="shrink-0 text-body text-foreground">{name}</b>
                    <select
                      value={values[k(area, name, String(i), "no")] || ""}
                      onChange={(e) => choosePump(area, name, i, e.target.value)}
                      className="w-[108px] rounded-control bg-muted p-3 font-semibold leading-[18px] text-primary outline-none"
                    >
                      <option value="">选择</option>
                      {ops.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => clearPump(area, name, i)}
                    className="-mr-2 min-w-11 shrink-0 px-2 text-xs font-normal text-subtle-foreground"
                  >
                    清空
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {field("南", k(area, name, String(i), "south"))}
                  {field("北", k(area, name, String(i), "north"))}
                  {field("前轴", k(area, name, String(i), "front"))}
                  {field("机身", k(area, name, String(i), "body"))}
                </div>
                <div className="mt-3 flex items-center border-t pt-3">
                  <b className="text-sm">盘根引水槽</b>
                  <span className="ml-auto mr-2 text-caption text-muted-foreground">
                    默认正常
                  </span>
                  {status(k(area, name, String(i), "water"))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </>
  );
  const belt = (
    <>
      <Head title="皮带区域" caption="两端轴位录数值，滚面与状态项默认正常。" />
      <div className="sticky top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] z-10 mb-4 grid h-11 grid-cols-3 gap-1 rounded-navigation bg-muted/95 p-1 shadow-card ring-1 ring-inset ring-border/70 backdrop-blur">
        {belts.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBeltTab(b.id)}
            aria-pressed={beltTab === b.id}
            className={`segmented-item relative h-full rounded-navigation-item py-0 text-label font-bold transition duration-200 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${beltTab === b.id ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
          >
            {b.id}
          </button>
        ))}
      </div>
      {belts.filter((b) => b.id === beltTab).map((b) => (
        <div className="space-y-2.5" key={b.id}>
          <div className="space-y-2.5">
            {items
              .filter(
                (item) =>
                  !(
                    (["SZ101", "SZ201"].includes(b.id) && item === "液力耦合器") ||
                    (b.id === "SZ201" && item === "头增面轮") ||
                    (b.id === "SZ201-N" && item === "中间滚筒") ||
                    (b.id === "SZ101" &&
                      ["配重东 / 南", "配重西 / 北", "配重", "中间滚筒"].includes(item))
                  ),
              )
              .map((item) => (
                <Card key={item}>
                  <CardContent className="p-3.5">
                    <div className="flex items-center justify-between">
                      <b className="text-card-title text-foreground">
                        {item !== "配重" && item.startsWith("配重") && (
                          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary/70 align-middle" aria-hidden="true" />
                        )}
                        {b.id === "SZ101" && item === "电机 / 减速机"
                          ? "电机"
                          : b.id === "SZ201-N" && item === "液力耦合器"
                            ? "液力耦合器"
                            : item}
                      </b>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => clearBeltItem(b.id, b.ends, item)}
                        className="-mr-2 min-w-11 px-2 text-xs font-normal text-subtle-foreground"
                      >
                        清空
                      </Button>
                    </div>
                    <div
                      className={`mt-2.5 grid gap-2 ${(b.id === "SZ101" && item === "电机 / 减速机") || (b.id === "SZ201-N" && item === "液力耦合器") ? "grid-cols-1" : "grid-cols-[repeat(2,minmax(0,1fr))]"}`}
                    >
                      {(b.id === "SZ101" && item === "电机 / 减速机") ||
                      (b.id === "SZ201-N" && item === "液力耦合器")
                        ? beltField(
                            b.id === "SZ101" ? "电机" : "液耦",
                            k("belt", b.id, item, b.id === "SZ101" ? "motor" : "fluid"),
                          )
                        : <>
                            {beltField(
                              item === "电机 / 减速机"
                                ? "电机"
                                : item === "配重东 / 南"
                                  ? "东"
                                  : item === "配重西 / 北"
                                    ? "西"
                                    : b.ends[0],
                              k("belt", b.id, item, b.ends[0]),
                            )}
                            {beltField(
                              item === "电机 / 减速机"
                                ? "减速机"
                                : item === "配重东 / 南"
                                  ? "南"
                                  : item === "配重西 / 北"
                                    ? "北"
                                    : b.ends[1],
                              k("belt", b.id, item, b.ends[1]),
                            )}
                          </>}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </>
  );
  const summary = (record: InspectionRecord) => {
    const snapshot = record.values;
    const pumpSummary = (area: "slag8" | "slag9") => {
      const entries = areas[area].groups.flatMap(([group]) =>
        [0, 1].flatMap((index) => {
          const no = snapshot[k(area, group, String(index), "no")];
          if (!no) return [];
          const readings = [
            ["南", "south"],
            ["北", "north"],
            ["前轴", "front"],
            ["机身", "body"],
          ].filter(([, field]) => snapshot[k(area, group, String(index), field)]);
          return [{ group, no, index, readings }];
        }),
      );
      return (
        <Card className="mb-3">
          <CardContent className="p-4">
            <b className="text-base">{areas[area].title}</b>
            {entries.length ? (
              <div className="mt-3 space-y-2">
                {entries.map(({ group, no, index, readings }) => (
                  <div className="rounded-control bg-muted px-3 py-2.5" key={`${group}-${index}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">{group} {no}</span>
                      <span className="text-caption text-muted-foreground">运行设备</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {readings.length ? (
                        readings.map(([label, field]) => (
                          <span className="rounded-small bg-card px-2 py-1 text-caption text-muted-foreground shadow-card" key={field}>
                            {label} <b className="ml-1 text-foreground">{snapshot[k(area, group, String(index), field)]}</b>
                          </span>
                        ))
                      ) : (
                        <span className="text-caption text-muted-foreground">未填写数值</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-body text-muted-foreground">暂无已填写数据</p>
            )}
          </CardContent>
        </Card>
      );
    };
    const beltSummary = belts
      .map((belt) => ({
        ...belt,
        rows: visibleBeltItems(belt.id)
          .map((item) => ({
            item: beltItemTitle(belt.id, item),
            readings: beltPoints(belt.id, belt.ends, item).filter(({ key }) => snapshot[key]),
          }))
          .filter(({ readings }) => readings.length),
      }))
      .filter(({ rows }) => rows.length);
    return (
      <>
        <div className="mb-4 flex h-8 items-center px-1">
          <h2 className="text-title font-black tracking-tight">巡检汇总</h2>
        </div>
        <Card className="mb-3">
          <CardContent className="p-4">
            <b className="text-base">皮带区域</b>
            {beltSummary.length ? (
              <div className="mt-3 space-y-2">
                {beltSummary.map(({ id, rows }) => (
                  <div className="rounded-control bg-muted p-3" key={id}>
                    <b className="text-sm">{id}</b>
                    <div className="mt-2 space-y-1.5">
                      {rows.map(({ item, readings }) => (
                        <div className="flex items-center justify-between gap-3 text-xs" key={item}>
                          <span className="text-muted-foreground">{item}</span>
                          <span className="grid shrink-0 grid-cols-[2em_2ch_3em_2ch] items-center gap-x-1 font-semibold text-foreground">
                            {[0, 1].map((index) =>
                              readings[index] ? (
                                <span className="contents" key={readings[index].key}>
                                  <span className="text-left">
                                    {readings[index].label}
                                  </span>
                                  <span className="text-right">{snapshot[readings[index].key]}</span>
                                </span>
                              ) : (
                                <span className="contents" key={index}>
                                  <span />
                                  <span />
                                </span>
                              ),
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-body text-muted-foreground">暂无已填写数据</p>
            )}
          </CardContent>
        </Card>
        {pumpSummary("slag8")}
        {pumpSummary("slag9")}
        <div className="h-20" aria-hidden="true" />
      </>
    );
  };
  const historyList = (
    <>
      <div className="mb-4 flex h-8 items-center justify-between px-1">
        <h2 className="text-title font-black tracking-tight">历史记录</h2>
        {records.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setManageHistory((current) => !current);
              setSelectedRecordIds([]);
            }}
            className="-mr-2 px-2 text-primary"
          >
            {manageHistory ? "完成" : "管理"}
          </Button>
        )}
      </div>
      {records.length ? (
        records.map((r) => (
          <Card className="mb-2" key={r.id}>
            <CardContent className="flex min-h-18 items-center gap-3">
              {manageHistory ? (
                <button
                  type="button"
                  onClick={() => toggleRecord(r.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${selectedRecordIds.includes(r.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    {selectedRecordIds.includes(r.id) && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span>
                    <b className="block text-card-title">{r.date}</b>
                    <span className="mt-1 block text-caption text-muted-foreground">
                      填写时间 {r.time}
                    </span>
                  </span>
                </button>
              ) : (
                <>
                  <div className="flex-1">
                    <b className="block text-card-title">{r.date}</b>
                    <p className="mt-1 text-caption text-muted-foreground">
                      填写时间 {r.time}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`查看 ${r.date} 的巡检记录`}
                    onClick={() => {
                      setHistoryDirection(1);
                      setSelectedRecord(r);
                    }}
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
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] mt-4 flex min-h-14 items-center px-1">
          <span className="text-body font-semibold text-muted-foreground">
            已选择 <b className="text-primary">{selectedRecordIds.length}</b> 条
          </span>
          <Button
            type="button"
            variant="destructive"
            disabled={selectedRecordIds.length === 0}
            onClick={() =>
              setDeleteRequest({
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
      )}
    </>
  );
  const history = (
    <>
      <AnimatePresence initial={false} mode="wait" custom={historyDirection}>
        <motion.div
          key={selectedRecord ? `detail-${selectedRecord.id}` : "list"}
          custom={historyDirection}
          variants={historyViewVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : historyViewTransition}
        >
          {selectedRecord ? summary(selectedRecord) : historyList}
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
                : { ...historyViewTransition, delay: historyViewTransition.duration },
            }}
            exit={{
              opacity: 0,
              y: reduceMotion ? 0 : 8,
              transition: reduceMotion ? { duration: 0 } : historyViewTransition,
            }}
          >
            <Button
              type="button"
              onClick={() => {
                setHistoryDirection(-1);
                setSelectedRecord(null);
              }}
              className="w-full"
            >
              返回历史记录
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="iconLarge"
              aria-label="删除当前记录"
              onClick={() =>
                setDeleteRequest({
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
  const commitSave = () => {
    const d = new Date(),
      r = {
        id: crypto.randomUUID(),
        date: d.toLocaleDateString("zh-CN"),
        time: d.toLocaleString("zh-CN"),
        values,
      };
    const next = [r, ...records];
    localStorage.setItem("night-inspection", JSON.stringify(next));
    setRecords(next);
    setSelectedRecord(null);
    setManageHistory(false);
    setSelectedRecordIds([]);
    setSaveValidation(null);
    setTab("history");
    toast.success("本次巡检已保存");
  };
  const validateBeforeSave = (): SaveValidation => {
    const unselectedPumps: string[] = [];
    const emptyInputs: string[] = [];
    (["slag8", "slag9"] as const).forEach((area) => {
      areas[area].groups.forEach(([group]) => {
        [0, 1].forEach((index) => {
          const device = `${areas[area].title} · ${group} · 设备${index + 1}`;
          if (!values[k(area, group, String(index), "no")]) {
            unselectedPumps.push(device);
          }
          ([
            ["南", "south"],
            ["北", "north"],
            ["前轴", "front"],
            ["机身", "body"],
          ] as const).forEach(([label, field]) => {
            if (!values[k(area, group, String(index), field)]) {
              emptyInputs.push(`${device} · ${label}`);
            }
          });
        });
      });
    });
    belts.forEach((belt) => {
      visibleBeltItems(belt.id).forEach((item) => {
        beltPoints(belt.id, belt.ends, item).forEach(({ label, key }) => {
          if (!values[key]) {
            emptyInputs.push(`皮带区域 · ${belt.id} · ${beltItemTitle(belt.id, item)} · ${label}`);
          }
        });
      });
    });
    return { unselectedPumps, emptyInputs };
  };
  const save = () => {
    const missing = validateBeforeSave();
    if (missing.unselectedPumps.length || missing.emptyInputs.length) {
      setSaveValidation(missing);
      return;
    }
    commitSave();
  };
  return (
    <main className="mx-auto min-h-svh max-w-md bg-background px-page pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="rounded-sheet bg-gradient-to-br from-header-start via-header-middle to-header-end p-5 text-primary-foreground shadow-floating ring-1 ring-white/10">
        <h1 className="text-3xl font-black tracking-tight">夜班巡检</h1>
        <p className="mt-1 text-body text-header-muted">
          把每一次巡检，清晰留在当下。
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="inverse"
            onClick={() => {
              setValues({});
              setBeltTab("SZ101");
              localStorage.removeItem(DRAFT_STORAGE_KEY);
              toast("已新建空白记录");
            }}
          >
            新建
          </Button>
          <Button
            onClick={save}
          >
            <Save />
            保存
          </Button>
        </div>
      </header>
      <nav className="sticky top-[max(0.75rem,env(safe-area-inset-top))] z-20 my-5 grid h-11 grid-cols-4 rounded-navigation bg-card/95 p-1 shadow-card ring-1 ring-inset ring-border/70 backdrop-blur">
        {(
          [
            ["slag8", "8#冲渣"],
            ["belt", "皮带"],
            ["slag9", "9#冲渣"],
            ["history", "历史记录"],
          ] as [Tab, string][]
        ).map(([id, l]) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
              if (id === "history") {
                setHistoryDirection(-1);
                setSelectedRecord(null);
                setManageHistory(false);
                setSelectedRecordIds([]);
              }
            }}
            className={`segmented-item relative h-full rounded-navigation-item py-0 text-caption font-bold transition duration-200 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${tab === id ? "bg-primary text-primary-foreground shadow-card" : "text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </nav>
      <AnimatePresence mode="wait">
        <motion.section
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.14 }}
        >
          {tab === "slag8"
            ? pump("slag8")
            : tab === "slag9"
              ? pump("slag9")
              : tab === "belt"
                ? belt
                : history}
        </motion.section>
      </AnimatePresence>
      <AnimatePresence>
        {saveValidation && (
          <SaveValidationDialog
            validation={saveValidation}
            onSave={commitSave}
            onCancel={() => setSaveValidation(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteRequest && (
          <DeleteDialog
            request={deleteRequest}
            onConfirm={confirmDeleteRecords}
            onCancel={() => setDeleteRequest(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function SaveValidationDialog({
  validation,
  onSave,
  onCancel,
}: {
  validation: SaveValidation;
  onSave: () => void;
  onCancel: () => void;
}) {
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
            <h3 id="save-validation-title" className="text-lg font-black text-foreground-strong">
              记录尚未填写完整
            </h3>
            <p className="mt-1 text-body text-muted-foreground">请检查以下内容，是否仍要保存？</p>
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
          <Button
            type="button"
            disabled={!isPresent}
            onClick={onCancel}
          >
            返回补充
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteDialog({
  request,
  onConfirm,
  onCancel,
}: {
  request: DeleteRequest;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
}: {
  request: DeleteRequest;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
    <section className={`rounded-small p-3 ${tone === "amber" ? "bg-warning-soft" : "bg-destructive-soft"}`}>
      <div className="flex items-center justify-between">
        <b className={`text-body ${tone === "amber" ? "text-warning" : "text-destructive"}`}>
          {title}
        </b>
        <span className={`rounded-full bg-card/80 px-2 py-0.5 text-caption ${tone === "amber" ? "text-warning" : "text-destructive"}`}>
          {items.length} 项
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li className="flex gap-2 text-caption leading-5 text-muted-foreground" key={item}>
            <span className="shrink-0 text-border">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
function Head({ title }: { title: string; caption: string }) {
  return (
    <div className="mb-4 px-1">
      <h2 className="text-title font-black tracking-tight">{title}</h2>
    </div>
  );
}
