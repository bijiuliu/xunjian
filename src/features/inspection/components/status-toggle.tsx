import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type StatusToggleProps = {
  value: string;
  onChange: (value: string) => void;
};

export function StatusToggle({ value, onChange }: StatusToggleProps) {
  const isAbnormal = value === "✕";

  return (
    <Button
      type="button"
      size="icon"
      variant={isAbnormal ? "ghost" : "secondary"}
      aria-label={isAbnormal ? "标记为正常" : "标记为异常"}
      onClick={() => onChange(isAbnormal ? "✓" : "✕")}
      className={isAbnormal ? "bg-destructive-soft text-destructive" : undefined}
    >
      {isAbnormal ? (
        <X size={19} strokeWidth={2.5} />
      ) : (
        <Check size={19} strokeWidth={2.5} />
      )}
    </Button>
  );
}
