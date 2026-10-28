"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays } from "@/lib/dates";
import { cx, inputClass } from "./ui";

/**
 * ‹ date › navigator that stays on the same page, changing `?date=`.
 * `confirmLeave` asks before picking another date (links are guarded by the page itself);
 * `disabled` freezes it (no network).
 */
export function DateNav({
  basePath,
  value,
  todayValue,
  confirmLeave,
  disabled = false,
}: {
  basePath: string;
  value: string;
  todayValue: string;
  confirmLeave?: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const href = (v: string) => `${basePath}?date=${v}`;
  const prev = addDays(value, -1);
  const next = value < todayValue ? addDays(value, 1) : null;
  const arrow =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-card text-ink-2 transition-colors hover:bg-subtle hover:text-ink";
  const off = "pointer-events-none opacity-40";

  return (
    <div className="flex items-center gap-2">
      <Link
        href={href(prev)}
        scroll={false}
        className={cx(arrow, disabled && off)}
        aria-label="Jour précédent"
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        <ChevronLeft className="size-5" />
      </Link>
      <input
        type="date"
        value={value}
        max={todayValue}
        disabled={disabled}
        aria-label="Choisir la date"
        onChange={(e) => {
          const v = e.target.value;
          if (v && v <= todayValue && (!confirmLeave || window.confirm(confirmLeave))) router.push(href(v), { scroll: false });
        }}
        className={cx(inputClass, "w-auto min-w-0 flex-1 px-3 text-base sm:w-48 sm:flex-none")}
      />
      {next && !disabled ? (
        <Link href={href(next)} scroll={false} className={arrow} aria-label="Jour suivant">
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span className={cx(arrow, off)} aria-hidden>
          <ChevronRight className="size-5" />
        </span>
      )}
      {value !== todayValue && !disabled && (
        <Link
          href={basePath}
          scroll={false}
            className="inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-accent-text hover:bg-accent-soft"
        >
          Aujourd&apos;hui
        </Link>
      )}
    </div>
  );
}

