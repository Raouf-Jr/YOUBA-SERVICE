"use client";

import type { ComponentProps } from "react";
import { parseAmount } from "@/lib/amount";
import { formatNumber } from "@/lib/format";
import { cx, inputClass } from "./ui";

/** Amount field that accepts "12500", "12 500" or "12500,50" and shows "12 500" once typed. */
export function MoneyInput({
  suffix,
  className,
  defaultValue,
  ...props
}: Omit<ComponentProps<"input">, "type" | "defaultValue"> & { suffix?: string; defaultValue?: number | null }) {
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        defaultValue={defaultValue ? formatNumber(defaultValue) : ""}
        onBlur={(e) => {
          const n = parseAmount(e.currentTarget.value);
          if (n !== null && !Number.isNaN(n) && n >= 0) e.currentTarget.value = formatNumber(n);
        }}
        className={cx(inputClass, "tabular h-12 text-base", suffix && "pr-16", className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted">{suffix}</span>
      )}
    </div>
  );
}
