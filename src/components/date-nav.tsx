"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cx, inputClass } from "./ui";

/** ‹ date › navigator that stays on the same page, changing `?{param}=`. */
export function DateNav({
  basePath,
  value,
  prev,
  next,
  todayValue,
  param = "date",
  type = "date",
  max,
}: {
  basePath: string;
  value: string;
  prev: string;
  next: string | null;
  todayValue: string;
  param?: string;
  type?: "date" | "month";
  max?: string;
}) {
  const router = useRouter();
  const href = (v: string) => `${basePath}?${param}=${v}`;
  const arrow =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-card text-ink-2 transition-colors hover:bg-subtle hover:text-ink";
  return (
    <div className="flex items-center gap-2">
      <Link href={href(prev)} scroll={false} className={arrow} aria-label="Précédent">
        <ChevronLeft className="size-4" />
      </Link>
      <input
        type={type}
        value={value}
        max={max}
        aria-label={type === "month" ? "Choisir le mois" : "Choisir la date"}
        onChange={(e) => e.target.value && router.push(href(e.target.value), { scroll: false })}
        className={cx(inputClass, "h-10 w-auto min-w-0 flex-1 rounded-xl px-3 text-sm sm:w-44 sm:flex-none")}
      />
      {next ? (
        <Link href={href(next)} scroll={false} className={arrow} aria-label="Suivant">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cx(arrow, "pointer-events-none opacity-40")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
      {value !== todayValue && (
        <Link
          href={href(todayValue)}
          scroll={false}
          className="inline-flex h-10 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-accent-text hover:bg-accent-soft"
        >
          {type === "month" ? "Ce mois" : "Aujourd'hui"}
        </Link>
      )}
    </div>
  );
}
