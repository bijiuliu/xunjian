import type { ChangeEvent } from "react";

type InspectionFieldProps = {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (fieldKey: string, value: string) => void;
  align?: "default" | "center";
};

export function InspectionField({
  label,
  fieldKey,
  value,
  onChange,
  align = "default",
}: InspectionFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(fieldKey, event.target.value);
  };

  return (
    <label
      className={
        align === "center"
          ? "rounded-control bg-muted px-3 py-2.5 text-center ring-1 ring-transparent transition focus-within:bg-card focus-within:ring-primary/25 focus-within:shadow-card"
          : "rounded-control bg-muted p-2.5 ring-1 ring-transparent transition focus-within:bg-card focus-within:ring-primary/25 focus-within:shadow-card"
      }
    >
      <span className="block text-label font-medium text-muted-foreground">
        {label}
      </span>
      <input
        inputMode="numeric"
        maxLength={2}
        value={value}
        onChange={handleChange}
        className={
          align === "center"
            ? "mt-1 w-full bg-transparent text-center text-lg font-bold outline-none"
            : "mt-1 w-full bg-transparent text-xl font-bold outline-none"
        }
      />
    </label>
  );
}
