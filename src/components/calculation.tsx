import type { ReactNode } from "react";
import { formatMoney } from "@/lib/format";
import { cx } from "./ui";

export type CalcLine = {
  /** Empty for the first line. */
  sign: "" | "+" | "−" | "=";
  label: ReactNode;
  hint?: ReactNode;
  amount: number;
};

/**
 * A total written out like in a notebook, one line per step:
 *   Investissement de départ      500 000
 * + Bénéfice                      120 000
 * − Dépenses sur le bénéfice       20 000
 * = Capital actuel                600 000
 */
export function Calculation({ lines, currency, className }: { lines: CalcLine[]; currency: string; className?: string }) {
  return (
    <dl className={cx("tabular flex flex-col", className)}>
      {lines.map((line, i) => {
        const total = line.sign === "=";
        return (
          <div
            key={i}
            className={cx(
              "flex items-baseline gap-3 py-2.5",
              total ? "mt-1 border-t-2 border-ink/80 pt-3" : i > 0 && "border-t border-line",
            )}
          >
            <span aria-hidden className={cx("w-4 shrink-0 text-center font-semibold", total ? "text-ink" : "text-muted")}>
              {line.sign}
            </span>
            <dt className="min-w-0 flex-1">
              <span className={cx("block", total ? "text-base font-semibold text-ink" : "text-[0.9375rem] text-ink")}>{line.label}</span>
              {line.hint && <span className="mt-0.5 block text-xs text-muted">{line.hint}</span>}
            </dt>
            <dd
              className={cx(
                "shrink-0 text-right",
                total ? "text-lg font-bold sm:text-xl" : "font-medium",
                total ? (line.amount < 0 ? "text-bad" : "text-ink") : "text-ink",
              )}
            >
              {formatMoney(line.amount, currency)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** A profit step: added when positive, subtracted (as a loss) when negative. */
export function profitLine(label: ReactNode, lossLabel: ReactNode, amount: number, hint?: ReactNode): CalcLine {
  return amount < 0 ? { sign: "−", label: lossLabel, hint, amount: -amount } : { sign: "+", label, hint, amount };
}
