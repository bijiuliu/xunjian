import { Card, CardContent } from "@/components/ui/card";
import { BELTS, PUMP_AREAS, PUMP_READING_FIELDS } from "../../model/config";
import {
  fieldKey,
  getBeltItemTitle,
  getBeltPoints,
  getVisibleBeltItems,
} from "../../model/field-rules";
import type { InspectionRecord, PumpAreaId } from "../../model/types";

export function InspectionSummary({ record }: { record: InspectionRecord }) {
  const snapshot = record.values;
  const beltSummary = BELTS.map((belt) => ({
    ...belt,
    rows: getVisibleBeltItems(belt.id)
      .map((item) => ({
        item: getBeltItemTitle(belt.id, item),
        readings: getBeltPoints(belt.id, belt.ends, item).filter(
          ({ key }) => snapshot[key],
        ),
      }))
      .filter(({ readings }) => readings.length),
  })).filter(({ rows }) => rows.length);

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
                      <div
                        className="flex items-center justify-between gap-3 text-xs"
                        key={item}
                      >
                        <span className="text-muted-foreground">{item}</span>
                        <span className="grid shrink-0 grid-cols-[2em_2ch_3em_2ch] items-center gap-x-1 font-semibold text-foreground">
                          {[0, 1].map((index) =>
                            readings[index] ? (
                              <span className="contents" key={readings[index].key}>
                                <span className="text-left">
                                  {readings[index].label}
                                </span>
                                <span className="text-right">
                                  {snapshot[readings[index].key]}
                                </span>
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
            <p className="mt-3 text-body text-muted-foreground">
              暂无已填写数据
            </p>
          )}
        </CardContent>
      </Card>
      <PumpSummary area="slag8" record={record} />
      <PumpSummary area="slag9" record={record} />
      <div className="h-20" aria-hidden="true" />
    </>
  );
}

function PumpSummary({
  area,
  record,
}: {
  area: PumpAreaId;
  record: InspectionRecord;
}) {
  const snapshot = record.values;
  const entries = PUMP_AREAS[area].groups.flatMap(([group]) =>
    [0, 1].flatMap((index) => {
      const pumpNumber = snapshot[fieldKey(area, group, String(index), "no")];
      if (!pumpNumber) return [];
      const readings = PUMP_READING_FIELDS.filter(
        ([, field]) => snapshot[fieldKey(area, group, String(index), field)],
      );
      return [{ group, pumpNumber, index, readings }];
    }),
  );

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <b className="text-base">{PUMP_AREAS[area].title}</b>
        {entries.length ? (
          <div className="mt-3 space-y-2">
            {entries.map(({ group, pumpNumber, index, readings }) => (
              <div
                className="rounded-control bg-muted px-3 py-2.5"
                key={`${group}-${index}`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">
                    {group} {pumpNumber}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    运行设备
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {readings.length ? (
                    readings.map(([label, field]) => (
                      <span
                        className="rounded-small bg-card px-2 py-1 text-caption text-muted-foreground shadow-card"
                        key={field}
                      >
                        {label}{" "}
                        <b className="ml-1 text-foreground">
                          {snapshot[fieldKey(area, group, String(index), field)]}
                        </b>
                      </span>
                    ))
                  ) : (
                    <span className="text-caption text-muted-foreground">
                      未填写数值
                    </span>
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
}
