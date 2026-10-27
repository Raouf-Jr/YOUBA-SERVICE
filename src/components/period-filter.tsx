import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { PERIOD_PRESETS, type Period } from "@/lib/period";
import { cx, inputClass } from "./ui";

/** Preset chips plus a custom range. Plain links and a GET form: works without JavaScript. */
export function PeriodFilter({
  period,
  basePath,
  presets = PERIOD_PRESETS.map((p) => p.key),
}: {
  period: Period;
  basePath: string;
  presets?: string[];
}) {
  return (
    <div className="no-print mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <nav aria-label="Période" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 lg:pb-0">
        {PERIOD_PRESETS.filter((p) => presets.includes(p.key)).map((p) => {
          const active = period.key === p.key;
          return (
            <Link
              key={p.key}
              href={`${basePath}?periode=${p.key}`}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={cx(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
                active
                  ? "border-transparent bg-ink text-card"
                  : "border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>
      <form action={basePath} method="get" className="flex items-center gap-2">
        <CalendarDays aria-hidden className="hidden size-4 text-muted sm:block" />
        <label className="sr-only" htmlFor="du">
          Du
        </label>
        <input
          id="du"
          name="du"
          type="date"
          defaultValue={period.range.from}
          className={cx(inputClass, "h-9 w-auto min-w-0 flex-1 rounded-lg px-2.5 text-sm lg:w-38 lg:flex-none")}
        />
        <span className="text-muted">→</span>
        <label className="sr-only" htmlFor="au">
          Au
        </label>
        <input
          id="au"
          name="au"
          type="date"
          defaultValue={period.range.to}
          className={cx(inputClass, "h-9 w-auto min-w-0 flex-1 rounded-lg px-2.5 text-sm lg:w-38 lg:flex-none")}
        />
        <button
          type="submit"
          className={cx(
            "h-9 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors",
            period.key === "perso" ? "border-transparent bg-ink text-card" : "border-line-strong bg-card text-ink hover:bg-subtle",
          )}
        >
          OK
        </button>
      </form>
    </div>
  );
}
