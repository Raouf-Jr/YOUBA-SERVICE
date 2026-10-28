import Form from "next/form";
import Link from "next/link";
import { PERIOD_PRESETS, type Period } from "@/lib/period";
import { cx, inputClass } from "./ui";

/**
 * Preset chips plus a custom "du … au …" range. Plain links and a search form: works without JavaScript.
 * `keep` carries other filters (e.g. the product) across period changes.
 */
export function PeriodFilter({
  period,
  basePath,
  presets = PERIOD_PRESETS.map((p) => p.key),
  keep = {},
}: {
  period: Period;
  basePath: string;
  presets?: string[];
  keep?: Record<string, string | undefined>;
}) {
  const kept = Object.entries(keep).filter((e): e is [string, string] => !!e[1]);
  const extra = kept.map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join("");
  const chips = presets.map((key) => PERIOD_PRESETS.find((p) => p.key === key)).filter((p) => !!p);
  return (
    <div className="no-print flex flex-col gap-3">
      <nav aria-label="Période" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((p) => {
          const active = period.key === p.key;
          return (
            <Link
              key={p.key}
              href={`${basePath}?periode=${p.key}${extra}`}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={cx(
                "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
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
      <Form action={basePath} scroll={false} className="grid grid-cols-2 items-end gap-2 sm:flex">
        {kept.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted">
          Du
          <input
            name="du"
            type="date"
            defaultValue={period.range.from}
            className={cx(inputClass, "h-10 min-w-0 px-2.5 text-sm sm:w-40")}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted">
          Au
          <input
            name="au"
            type="date"
            defaultValue={period.range.to}
            className={cx(inputClass, "h-10 min-w-0 px-2.5 text-sm sm:w-40")}
          />
        </label>
        <button
          type="submit"
          className={cx(
            "col-span-2 h-10 shrink-0 rounded-xl border px-4 text-sm font-medium transition-colors",
            period.key === "perso" ? "border-transparent bg-ink text-card" : "border-line-strong bg-card text-ink hover:bg-subtle",
          )}
        >
          Voir cette période
        </button>
      </Form>
    </div>
  );
}
