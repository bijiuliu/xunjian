import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BELTS } from "../../model/config";
import {
  getBeltItemTitle,
  getBeltPoints,
  getVisibleBeltItems,
} from "../../model/field-rules";
import type { BeltId, InspectionValues } from "../../model/types";
import { InspectionField } from "../inspection-field";
import { SectionHeading } from "../section-heading";

type BeltAreaProps = {
  beltTab: BeltId;
  values: InspectionValues;
  onSelectBelt: (belt: BeltId) => void;
  onValueChange: (fieldKey: string, value: string) => void;
  onClearItem: (
    belt: BeltId,
    ends: readonly string[],
    item: string,
  ) => void;
};

export function BeltArea({
  beltTab,
  values,
  onSelectBelt,
  onValueChange,
  onClearItem,
}: BeltAreaProps) {
  const belt = BELTS.find(({ id }) => id === beltTab) ?? BELTS[0];

  return (
    <>
      <SectionHeading title="皮带区域" />
      <div className="sticky top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] z-10 mb-4 grid h-11 grid-cols-3 gap-1 rounded-navigation bg-muted/95 p-1 shadow-card ring-1 ring-inset ring-border/70 backdrop-blur">
        {BELTS.map(({ id }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectBelt(id)}
            aria-pressed={beltTab === id}
            className={`segmented-item relative h-full rounded-navigation-item py-0 text-label font-bold transition duration-200 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${beltTab === id ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
          >
            {id}
          </button>
        ))}
      </div>
      <div className="space-y-2.5">
        {getVisibleBeltItems(belt.id).map((item) => {
          const points = getBeltPoints(belt.id, belt.ends, item);
          return (
            <Card key={item}>
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <b className="text-card-title text-foreground">
                    {item !== "配重" && item.startsWith("配重") && (
                      <span
                        className="mr-1.5 inline-block size-1.5 rounded-full bg-primary/70 align-middle"
                        aria-hidden="true"
                      />
                    )}
                    {belt.id === "SZ201-N" && item === "液力耦合器"
                      ? "液力耦合器"
                      : getBeltItemTitle(belt.id, item)}
                  </b>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onClearItem(belt.id, belt.ends, item)}
                    className="-mr-2 min-w-11 px-2 text-xs font-normal text-subtle-foreground"
                  >
                    清空
                  </Button>
                </div>
                <div
                  className={`mt-2.5 grid gap-2 ${points.length === 1 ? "grid-cols-1" : "grid-cols-[repeat(2,minmax(0,1fr))]"}`}
                >
                  {points.map((point) => (
                    <InspectionField
                      key={point.key}
                      label={point.label}
                      fieldKey={point.key}
                      value={values[point.key] || ""}
                      onChange={onValueChange}
                      align="center"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
