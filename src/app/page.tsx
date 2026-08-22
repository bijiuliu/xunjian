"use client";
import { type ChangeEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
const checks = new Set([
  "皮带情况",
  "高速 / 低速联轴器",
  "头轮气管",
  "尾轮下料口",
]);
const DRAFT_STORAGE_KEY = "night-inspection-draft";
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
  const [tab, setTab] = useState<Tab>("slag8"),
    [beltTab, setBeltTab] = useState<BeltTab>("SZ101"),
    [values, setValues] = useState<Values>({}),
    [records, setRecords] = useState<InspectionRecord[]>([]),
    [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null),
    [manageHistory, setManageHistory] = useState(false),
    [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]),
    [deleteRequest, setDeleteRequest] = useState<{ ids: string[]; label: string } | null>(null),
    [saveValidation, setSaveValidation] = useState<SaveValidation | null>(null),
    [draftReady, setDraftReady] = useState(false);
  useEffect(
    () =>
      setRecords(JSON.parse(localStorage.getItem("night-inspection") || "[]") as InspectionRecord[]),
    [],
  );
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    if (draftReady) localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ values, beltTab }));
  }, [beltTab, draftReady, values]);
  const put = (n: string, v: string) => setValues((x) => ({ ...x, [n]: v }));
  const status = (n: string) => (
    <button
      onClick={() => put(n, values[n] === "✕" ? "✓" : "✕")}
      className={`grid size-10 place-items-center rounded-xl ${values[n] === "✕" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"}`}
    >
      {values[n] === "✕" ? <X /> : <Check />}
    </button>
  );
  const numericInput = (n: string) => ({
    inputMode: "numeric" as const,
    maxLength: 2,
    value: values[n] || "",
    onChange: (e: ChangeEvent<HTMLInputElement>) => put(n, e.target.value),
  });
  const field = (l: string, n: string) => (
    <label className="rounded-xl bg-slate-50 p-2.5">
      <span className="block text-[11px] text-slate-500">{l}</span>
      <input
        {...numericInput(n)}
        className="mt-1 w-full bg-transparent text-xl font-bold outline-none focus:text-blue-500"
      />
    </label>
  );
  const beltField = (l: string, n: string) => (
    <label className="rounded-2xl bg-slate-50 px-3 py-2.5 text-center ring-1 ring-slate-100 transition focus-within:bg-blue-50 focus-within:ring-blue-200">
      <span className="block text-[11px] font-medium text-slate-500">{l}</span>
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
    if (selectedRecord && deleting.has(selectedRecord.id)) setSelectedRecord(null);
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
                    <b className="shrink-0">{name}</b>
                    <select
                      value={values[k(area, name, String(i), "no")] || ""}
                      onChange={(e) => choosePump(area, name, i, e.target.value)}
                      className="w-[108px] rounded-xl bg-slate-50 p-3 font-semibold leading-[18px] text-blue-500 outline-none"
                    >
                      <option value="">选择</option>
                      {ops.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearPump(area, name, i)}
                    className="shrink-0 text-xs text-slate-400"
                  >
                    清空
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {field("南", k(area, name, String(i), "south"))}
                  {field("北", k(area, name, String(i), "north"))}
                  {field("前轴", k(area, name, String(i), "front"))}
                  {field("机身", k(area, name, String(i), "body"))}
                </div>
                <div className="mt-3 flex items-center border-t pt-3">
                  <b className="text-sm">盘根引水槽</b>
                  <span className="ml-auto mr-2 text-xs text-slate-400">
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
      <div className="sticky top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] z-10 mb-4 grid h-[42px] grid-cols-3 gap-1 rounded-xl bg-slate-200 p-1">
        {belts.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBeltTab(b.id)}
            className={`rounded-lg py-2 text-[11px] font-bold transition ${beltTab === b.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
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
                <Card className="border-0 shadow-sm ring-1 ring-slate-200/80" key={item}>
                  <CardContent className="p-3.5">
                    <div className="flex items-center justify-between">
                      <b className="text-[15px] text-slate-900">
                        {item !== "配重" && item.startsWith("配重") && (
                          <span className="mr-1.5 text-sm">●</span>
                        )}
                        {b.id === "SZ101" && item === "电机 / 减速机"
                          ? "电机"
                          : b.id === "SZ201-N" && item === "液力耦合器"
                            ? "液力耦合器"
                            : item}
                      </b>
                      <button
                        type="button"
                        onClick={() => clearBeltItem(b.id, b.ends, item)}
                        className="text-xs text-slate-400"
                      >
                        清空
                      </button>
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
      const entries = areas[area].groups.flatMap(([group, pumps]) =>
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
        <Card className="mb-3 border-0 shadow-sm ring-1 ring-slate-200/80">
          <CardContent className="p-4">
            <b className="text-base">{areas[area].title}</b>
            {entries.length ? (
              <div className="mt-3 space-y-2">
                {entries.map(({ group, no, index, readings }) => (
                  <div className="rounded-2xl bg-slate-50 px-3 py-2.5" key={`${group}-${index}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{group} {no}</span>
                      <span className="text-xs text-slate-400">运行设备</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {readings.length ? (
                        readings.map(([label, field]) => (
                          <span className="rounded-lg bg-white px-2 py-1 text-xs text-slate-600" key={field}>
                            {label} <b className="ml-1 text-slate-900">{snapshot[k(area, group, String(index), field)]}</b>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">未填写数值</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">暂无已填写数据</p>
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
          <h2 className="text-2xl font-black tracking-tight">巡检汇总</h2>
        </div>
        <Card className="mb-3 border-0 shadow-sm ring-1 ring-slate-200/80">
          <CardContent className="p-4">
            <b className="text-base">皮带区域</b>
            {beltSummary.length ? (
              <div className="mt-3 space-y-2">
                {beltSummary.map(({ id, rows }) => (
                  <div className="rounded-2xl bg-slate-50 p-3" key={id}>
                    <b className="text-sm">{id}</b>
                    <div className="mt-2 space-y-1.5">
                      {rows.map(({ item, readings }) => (
                        <div className="flex items-center justify-between gap-3 text-xs" key={item}>
                          <span className="text-slate-500">{item}</span>
                          <span className="grid shrink-0 grid-cols-[2em_2ch_3em_2ch] items-center gap-x-1 font-semibold text-slate-900">
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
              <p className="mt-3 text-sm text-slate-400">暂无已填写数据</p>
            )}
          </CardContent>
        </Card>
        {pumpSummary("slag8")}
        {pumpSummary("slag9")}
        <div className="h-20" aria-hidden="true" />
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 grid w-[calc(100%-2rem)] max-w-[416px] -translate-x-1/2 grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => setSelectedRecord(null)}
            className="rounded-2xl bg-blue-500 py-3 text-sm font-bold text-white shadow-xl shadow-blue-900/20"
          >
            返回历史记录
          </button>
          <button
            type="button"
            aria-label="删除当前记录"
            onClick={() =>
              setDeleteRequest({ ids: [record.id], label: `${record.date} ${record.time}` })
            }
            className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-500 shadow-xl shadow-rose-900/15"
          >
            <Trash2 size={19} />
          </button>
        </div>
      </>
    );
  };
  const history = (
    <>
      {selectedRecord ? summary(selectedRecord) : <>
      <div className="mb-4 flex h-8 items-center justify-between px-1">
        <h2 className="text-2xl font-black tracking-tight">历史记录</h2>
        {records.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setManageHistory((current) => !current);
              setSelectedRecordIds([]);
            }}
            className="h-8 px-2 text-sm font-semibold text-blue-500"
          >
            {manageHistory ? "完成" : "管理"}
          </button>
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
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${selectedRecordIds.includes(r.id) ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white"}`}
                  >
                    {selectedRecordIds.includes(r.id) && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span>
                    <b className="block text-[15px]">{r.date}</b>
                    <span className="mt-1 block text-xs text-slate-400">
                      填写时间 {r.time}
                    </span>
                  </span>
                </button>
              ) : (
                <>
                  <div className="flex-1">
                    <b className="block text-[15px]">{r.date}</b>
                    <p className="mt-1 text-xs text-slate-400">
                      填写时间 {r.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`查看 ${r.date} 的巡检记录`}
                    onClick={() => setSelectedRecord(r)}
                    className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-400"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <History className="mx-auto mb-3" />
            暂无历史记录
          </CardContent>
        </Card>
      )}
      {manageHistory && records.length > 0 && (
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] mt-4 flex min-h-14 items-center px-1">
          <span className="text-sm font-semibold text-slate-500">
            已选择 <b className="text-blue-500">{selectedRecordIds.length}</b> 条
          </span>
          <button
            type="button"
            disabled={selectedRecordIds.length === 0}
            onClick={() =>
              setDeleteRequest({
                ids: selectedRecordIds,
                label: `${selectedRecordIds.length} 条历史记录`,
              })
            }
            className="ml-auto flex min-h-10 items-center gap-1.5 rounded-[14px] bg-rose-500 px-4 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 disabled:opacity-40 disabled:shadow-none"
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      )}
      </>}
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
    <main className="mx-auto min-h-svh max-w-md bg-[#f2f2f7] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-xl shadow-slate-900/20">
        <h1 className="text-3xl font-black tracking-tight">夜班巡检</h1>
        <p className="mt-1 text-sm text-slate-300">
          把每一次巡检，清晰留在当下。
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            className="bg-white text-slate-900 shadow-none hover:bg-slate-100"
            variant="default"
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
            className="bg-blue-500 shadow-none hover:bg-blue-400"
            onClick={save}
          >
            <Save />
            保存
          </Button>
        </div>
      </header>
      <nav className="sticky top-[max(0.75rem,env(safe-area-inset-top))] z-20 my-5 grid h-11 grid-cols-4 rounded-2xl bg-white p-1 shadow-sm shadow-slate-900/10">
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
            onClick={() => {
              setTab(id);
              if (id === "history") {
                setSelectedRecord(null);
                setManageHistory(false);
                setSelectedRecordIds([]);
              }
            }}
            className={`rounded-xl py-2 text-xs font-bold transition ${tab === id ? "bg-blue-500 text-white shadow-sm shadow-blue-500/25" : "text-slate-500"}`}
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
          transition={{ duration: 0.18 }}
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
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSaveValidation(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="save-validation-title"
              className="w-full max-w-md rounded-[26px] bg-white p-4 shadow-2xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-3 px-1 pb-3 pt-1">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-500">
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <h3 id="save-validation-title" className="text-lg font-black text-slate-950">
                    记录尚未填写完整
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">请检查以下内容，是否仍要保存？</p>
                </div>
              </div>
              <div className="max-h-[46svh] space-y-3 overflow-y-auto py-1">
                {saveValidation.unselectedPumps.length > 0 && (
                  <MissingGroup
                    title="未选择泵号"
                    items={saveValidation.unselectedPumps}
                    tone="amber"
                  />
                )}
                {saveValidation.emptyInputs.length > 0 && (
                  <MissingGroup
                    title="未填写数值"
                    items={saveValidation.emptyInputs}
                    tone="rose"
                  />
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={commitSave}
                  className="rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-600"
                >
                  仍然保存
                </button>
                <button
                  type="button"
                  onClick={() => setSaveValidation(null)}
                  className="rounded-2xl bg-blue-500 py-3 text-sm font-bold text-white"
                >
                  返回补充
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteRequest && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteRequest(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-title"
              className="w-full max-w-md rounded-[26px] bg-white p-4 shadow-2xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-2 pb-4 pt-1 text-center">
                <h3 id="delete-title" className="text-lg font-black text-slate-950">
                  确认删除？
                </h3>
                <p className="mt-1 text-sm text-slate-400">{deleteRequest.label}</p>
              </div>
              <button
                type="button"
                onClick={confirmDeleteRecords}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3 text-sm font-bold text-white"
              >
                <Trash2 size={17} />
                确认删除
              </button>
              <button
                type="button"
                onClick={() => setDeleteRequest(null)}
                className="mt-2 w-full rounded-2xl py-3 text-sm font-semibold text-slate-500"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
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
    <section className={`rounded-2xl p-3 ${tone === "amber" ? "bg-amber-50" : "bg-rose-50"}`}>
      <div className="flex items-center justify-between">
        <b className={`text-sm ${tone === "amber" ? "text-amber-700" : "text-rose-700"}`}>
          {title}
        </b>
        <span className={`rounded-full bg-white/80 px-2 py-0.5 text-xs ${tone === "amber" ? "text-amber-600" : "text-rose-600"}`}>
          {items.length} 项
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li className="flex gap-2 text-xs leading-5 text-slate-600" key={item}>
            <span className="shrink-0 text-slate-300">•</span>
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
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
    </div>
  );
}
