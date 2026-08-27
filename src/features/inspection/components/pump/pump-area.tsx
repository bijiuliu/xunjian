import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PUMP_AREAS, PUMP_READING_FIELDS } from "../../model/config";
import { fieldKey } from "../../model/field-rules";
import type { InspectionValues, PumpAreaId } from "../../model/types";
import { InspectionField } from "../inspection-field";
import { SectionHeading } from "../section-heading";
import { StatusToggle } from "../status-toggle";

type PumpAreaProps = {
  area: PumpAreaId;
  values: InspectionValues;
  onValueChange: (fieldKey: string, value: string) => void;
  onSelectPump: (
    area: PumpAreaId,
    group: string,
    index: number,
    pumpNo: string,
  ) => void;
  onClearPump: (area: PumpAreaId, group: string, index: number) => void;
};

export function PumpArea({
  area,
  values,
  onValueChange,
  onSelectPump,
  onClearPump,
}: PumpAreaProps) {
  const config = PUMP_AREAS[area];

  return (
    <>
      <SectionHeading title={config.title} />
      {config.groups.map(([group, pumpNumbers]) => (
        <section key={group}>
          {[0, 1].map((index) => (
            <Card className="mb-3" key={index}>
              <CardContent>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <b className="shrink-0 text-body text-foreground">{group}</b>
                    <select
                      value={
                        values[fieldKey(area, group, String(index), "no")] || ""
                      }
                      onChange={(event) =>
                        onSelectPump(
                          area,
                          group,
                          index,
                          event.target.value,
                        )
                      }
                      className="w-[108px] rounded-control bg-muted p-3 font-semibold leading-[18px] text-primary outline-none"
                    >
                      <option value="">选择</option>
                      {pumpNumbers.map((pumpNumber) => (
                        <option key={pumpNumber}>{pumpNumber}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onClearPump(area, group, index)}
                    className="-mr-2 min-w-11 shrink-0 px-2 text-xs font-normal text-subtle-foreground"
                  >
                    清空
                  </Button>
                </div>
                <div className="pump-readings mt-2 grid grid-cols-2 gap-2">
                  {PUMP_READING_FIELDS.map(([label, field]) => {
                    const key = fieldKey(area, group, String(index), field);
                    return (
                      <InspectionField
                        key={field}
                        label={label}
                        fieldKey={key}
                        value={values[key] || ""}
                        onChange={onValueChange}
                      />
                    );
                  })}
                </div>
                <div className="pump-status-row mt-3 flex items-center border-t pt-3">
                  <b className="text-sm">盘根引水槽</b>
                  <span className="ml-auto mr-2 text-caption text-muted-foreground">
                    默认正常
                  </span>
                  <StatusToggle
                    value={
                      values[fieldKey(area, group, String(index), "water")] || ""
                    }
                    onChange={(value) =>
                      onValueChange(
                        fieldKey(area, group, String(index), "water"),
                        value,
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </>
  );
}
