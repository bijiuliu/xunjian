"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
  error?: string;
  labelAction?: ReactNode;
};

export function PasswordField({
  id,
  label,
  error,
  labelAction,
  className,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <label className="block" htmlFor={id}>
      <span className="relative mb-2 flex min-h-5 items-center gap-2 text-caption font-bold text-muted-foreground">
        <LockKeyhole className="size-4" />
        {label}
        {labelAction}
      </span>
      <span className="relative block">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`min-h-12 w-full rounded-control border bg-card px-4 pr-12 text-base shadow-card outline-none transition focus:ring-4 focus:ring-primary/15 ${error ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"} ${className ?? ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={props.disabled}
          aria-label={visible ? `隐藏${label}` : `显示${label}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-control text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
        >
          {visible ? <EyeOff className="size-[1.125rem]" /> : <Eye className="size-[1.125rem]" />}
        </button>
      </span>
      {error && (
        <span id={errorId} className="mt-1.5 block text-caption font-semibold text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}
