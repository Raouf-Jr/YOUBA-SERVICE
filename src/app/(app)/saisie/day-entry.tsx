"use client";

import { ArrowRight, Check, CloudOff, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useOffline } from "next/offline";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DateNav } from "@/components/date-nav";
import { Spinner } from "@/components/form-bits";
import { Badge, Button, Card, cx, inputClass } from "@/components/ui";
import { parseAmount } from "@/lib/amount";
import { formatDayLong, today, type ISODate } from "@/lib/dates";
import { currencySymbol, formatMoney, formatNumber } from "@/lib/format";
import { addEntry, isWaiting, newId, removeEntry, useOutbox } from "@/lib/offline/outbox";
import { syncOutbox, type SyncOutcome } from "@/lib/offline/sync";
import type { DayPayload } from "@/lib/offline/types";

type Product = { id: string; name: string };
type Line = DayPayload["lines"][number];
type Field = "revenue" | "expense";
type Draft = Record<Field, string>;
type Amounts = Record<Field, number>;

const LEAVE = "Vous avez des chiffres non enregistrés. Quitter quand même ?";
const noSubscribe = () => () => {};
const toText = (n: number) => (n ? formatNumber(n) : "");
const profitOf = (l?: Amounts) => (l ? l.revenue - l.expense : 0);
const isBad = (text: string) => {
  const n = parseAmount(text);
  return n !== null && (Number.isNaN(n) || n < 0 || n > 1e11);
};

/**
 * One day: the recette and dépense of each product, then the day's result per product.
 * Saving goes through the device's queue, so it also works without network.
 */
export function DayEntry({
  userId,
  date: serverDate,
  followToday,
  timezone,
  currency,
  saved,
  products,
}: {
  userId: string;
  date: ISODate;
  /** No date asked: the page follows the phone's "today" (a copy saved for offline use may be older). */
  followToday: boolean;
  timezone: string;
  currency: string;
  saved: Line[];
  products: Product[];
}) {
  const offline = useOffline();
  const phoneToday = useSyncExternalStore(noSubscribe, () => today(timezone), () => serverDate);
  const date = followToday ? phoneToday : serverDate;
  const maxDate = phoneToday > serverDate ? phoneToday : serverDate;
  const money = (n: number) => formatMoney(n, currency);

  // What is saved for the day: the server's figures, overridden by the latest version kept on this phone.
  const outbox = useOutbox(userId);
  const queued = outbox.filter((e) => e.payload.date === date);
  const latest = queued.at(-1);
  const serverLines = date === serverDate ? saved : [];
  const base = new Map([...serverLines, ...(latest?.payload.lines ?? [])].map((l) => [l.productId, l]));

  // What is typed but not saved yet (forgotten when the date changes).
  const [edits, setEdits] = useState<{ date: ISODate; values: Record<string, Partial<Draft>> }>({ date, values: {} });
  const values = edits.date === date ? edits.values : {};
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ stamp: number; outcome: SyncOutcome | "sending" } | null>(null);
  const summaryRef = useRef<HTMLElement>(null);

  const draft = (id: string): Draft => ({
    revenue: values[id]?.revenue ?? toText(base.get(id)?.revenue ?? 0),
    expense: values[id]?.expense ?? toText(base.get(id)?.expense ?? 0),
  });
  const typed = (id: string): Amounts => {
    const d = draft(id);
    return { revenue: parseAmount(d.revenue) ?? 0, expense: parseAmount(d.expense) ?? 0 };
  };
  const setField = (id: string, field: Field, value: string) => {
    setEdits((prev) => {
      const current = prev.date === date ? prev.values : {};
      return { date, values: { ...current, [id]: { ...current[id], [field]: value } } };
    });
    const key = `${id}-${field}`;
    if (errors[key]) setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
  };

  const dirty = products.some((p) => {
    if (!values[p.id]) return false;
    const t = typed(p.id);
    const b = base.get(p.id);
    return t.revenue !== (b?.revenue ?? 0) || t.expense !== (b?.expense ?? 0);
  });

  // Unsaved figures: ask before leaving the page.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (link && !window.confirm(LEAVE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  // The "Enregistré" confirmation on the button fades after a moment.
  useEffect(() => {
    if (status?.outcome !== "done") return;
    const stamp = status.stamp;
    const timer = setTimeout(() => setStatus((s) => (s?.stamp === stamp ? null : s)), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  function save() {
    const found: Record<string, string> = {};
    const lines = products.map((p) => {
      const d = draft(p.id);
      if (isBad(d.revenue)) found[`${p.id}-revenue`] = "Montant invalide";
      if (isBad(d.expense)) found[`${p.id}-expense`] = "Montant invalide";
      return { productId: p.id, ...typed(p.id), note: base.get(p.id)?.note ?? null };
    });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    const stamp = queueDay(userId, { date, lines }, queued.filter((e) => e.error).map((e) => e.id));
    setEdits({ date, values: {} });
    setErrors({});
    setStatus({ stamp, outcome: "sending" });
    void syncOutbox(userId).then((outcome) => setStatus((s) => (s?.stamp === stamp ? { stamp, outcome } : s)));
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const totals = products.reduce(
    (sum, p) => {
      const t = typed(p.id);
      return {
        revenue: sum.revenue + (Number.isNaN(t.revenue) ? 0 : t.revenue),
        expense: sum.expense + (Number.isNaN(t.expense) ? 0 : t.expense),
      };
    },
    { revenue: 0, expense: 0 },
  );
  const symbol = currencySymbol(currency);

  return (
    <div>
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{date === phoneToday ? "Aujourd'hui" : "Journée du"}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{formatDayLong(date)}</h1>
        </div>
        <div className="flex flex-col gap-1.5">
          <DateNav basePath="/saisie" value={date} todayValue={maxDate} confirmLeave={dirty ? LEAVE : null} disabled={offline} />
          {offline && <p className="text-xs text-muted">Sans réseau, seule cette journée peut être saisie.</p>}
        </div>
      </header>

      <div className="mb-4 rounded-2xl bg-subtle/70 px-4 py-3 text-sm text-ink-2">
        <p>Pour chaque produit, notez :</p>
        <ul className="mt-1.5 flex flex-col gap-1">
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-revenue" />
            <span>
              <strong className="font-semibold text-ink">Recette</strong> : l&apos;argent qui est rentré
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-expenses" />
            <span>
              <strong className="font-semibold text-ink">Dépense</strong> : l&apos;argent qui est sorti pour ce produit
            </span>
          </li>
        </ul>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              name={p.name}
              id={p.id}
              draft={draft(p.id)}
              profit={profitOf(typed(p.id))}
              errors={errors}
              symbol={symbol}
              money={money}
              onChange={(field, value) => setField(p.id, field, value)}
            />
          ))}
        </div>

        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-4 border-y border-line bg-canvas/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:bg-card/90 sm:px-5 sm:shadow-pop md:bottom-4">
          <div className="flex items-center gap-3">
            <dl className="tabular grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-2 text-sm sm:flex sm:gap-x-6">
              <div className="contents sm:block">
                <dt className="text-muted">Recettes</dt>
                <dd className="truncate font-semibold text-ink sm:text-base">{money(totals.revenue)}</dd>
              </div>
              <div className="contents sm:block">
                <dt className="text-muted">Dépenses</dt>
                <dd className="truncate font-semibold text-ink sm:text-base">{money(totals.expense)}</dd>
              </div>
              <div className="hidden sm:block">
                <dt className="text-muted">Bénéfice</dt>
                <dd className={cx("truncate font-semibold sm:text-base", tone(totals.revenue - totals.expense))}>
                  {signed(totals.revenue - totals.expense, money)}
                </dd>
              </div>
            </dl>
            <Button type="submit" size="lg" className="shrink-0 px-6" disabled={status?.outcome === "sending"}>
              {status?.outcome === "sending" ? (
                <>
                  <Spinner />
                  Envoi…
                </>
              ) : status?.outcome === "done" && !dirty ? (
                <>
                  <Check />
                  Enregistré
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </div>
      </form>

      <section ref={summaryRef} aria-labelledby="bilan-jour" className="mt-8 scroll-mt-24">
        <DaySummary
          date={date}
          products={products}
          saved={base}
          money={money}
          state={
            latest?.error
              ? { kind: "refused", message: latest.error }
              : latest && isWaiting(latest)
                ? { kind: offline ? "offline" : "sending" }
                : { kind: "saved" }
          }
        />
      </section>
    </div>
  );
}

function ProductCard({
  id,
  name,
  draft,
  profit,
  errors,
  symbol,
  money,
  onChange,
}: {
  id: string;
  name: string;
  draft: Draft;
  profit: number;
  errors: Record<string, string>;
  symbol: string;
  money: (n: number) => string;
  onChange: (field: Field, value: string) => void;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-semibold text-ink">{name}</h2>
        {!Number.isNaN(profit) && profit !== 0 && (
          <span className="tabular shrink-0 text-sm text-muted">
            Bénéfice <strong className={cx("font-semibold", tone(profit))}>{signed(profit, money)}</strong>
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["revenue", "expense"] as const).map((field) => {
          const inputId = `${id}-${field}`;
          const error = errors[inputId];
          return (
            <div key={field} className="min-w-0">
              <label htmlFor={inputId} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
                <span aria-hidden className={cx("size-2.5 shrink-0 rounded-full", field === "revenue" ? "bg-revenue" : "bg-expenses")} />
                {field === "revenue" ? "Recette" : "Dépense"}
                <span className="truncate font-normal text-muted">({symbol})</span>
              </label>
              <input
                id={inputId}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={draft[field]}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                onChange={(e) => onChange(field, e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => {
                  const n = parseAmount(e.target.value);
                  if (n !== null && !Number.isNaN(n) && n >= 0) onChange(field, toText(n));
                }}
                className={cx(inputClass, "tabular h-14 px-3 text-lg font-medium")}
              />
              {error && (
                <p id={`${inputId}-error`} className="mt-1 text-xs text-bad">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

type SaveState = { kind: "saved" } | { kind: "sending" } | { kind: "offline" } | { kind: "refused"; message: string };

function DaySummary({
  date,
  products,
  saved,
  money,
  state,
}: {
  date: ISODate;
  products: Product[];
  saved: Map<string, Amounts>;
  money: (n: number) => string;
  state: SaveState;
}) {
  const rows = products
    .map((p) => ({ product: p, day: saved.get(p.id) }))
    .filter((r): r is { product: Product; day: Amounts } => !!r.day && (r.day.revenue > 0 || r.day.expense > 0));
  const revenue = rows.reduce((s, r) => s + r.day.revenue, 0);
  const expense = rows.reduce((s, r) => s + r.day.expense, 0);

  return (
    <Card>
      <div className="flex flex-col gap-2 px-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 id="bilan-jour" className="text-lg font-semibold text-ink">
            Bilan de la journée
          </h2>
          <p className="text-sm text-muted">{formatDayLong(date)}</p>
        </div>
        {rows.length > 0 && <SaveBadge state={state} />}
      </div>
      {state.kind === "refused" && (
        <p className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2.5 text-sm text-bad sm:mx-5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Ces chiffres n&apos;ont pas été acceptés ({state.message}). Vérifiez-les puis enregistrez à nouveau.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="px-4 pt-3 pb-6 text-[0.9375rem] text-ink-2 sm:px-5">
          Rien n&apos;est encore enregistré pour cette journée. Remplissez les montants puis touchez{" "}
          <strong className="text-ink">Enregistrer</strong>.
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {rows.map(({ product, day }) => (
              <li key={product.id} className="tabular px-4 py-3 sm:px-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate font-medium text-ink">{product.name}</p>
                  <span className={cx("shrink-0 font-semibold", tone(profitOf(day)))}>{signed(profitOf(day), money)}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-2">
                  Recette {money(day.revenue)} − Dépense {money(day.expense)}
                </p>
              </li>
            ))}
          </ul>
          <div className="tabular flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line bg-subtle/60 px-4 py-4 sm:px-5">
            <p className="font-semibold text-ink">Bénéfice de la journée</p>
            <p className={cx("text-lg font-bold", tone(revenue - expense))}>{signed(revenue - expense, money)}</p>
            <p className="w-full text-sm text-ink-2">
              Recettes {money(revenue)} − Dépenses {money(expense)}
            </p>
          </div>
        </>
      )}
      <div className="no-print px-4 py-4 sm:px-5">
        <Link
          href="/bilan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text underline-offset-4 hover:underline"
        >
          Voir le bilan de toute la boutique
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </Card>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state.kind === "sending") {
    return (
      <Badge tone="accent" className="self-start">
        <Spinner className="size-3.5" />
        Envoi…
      </Badge>
    );
  }
  if (state.kind === "offline") {
    return (
      <Badge tone="warn" className="self-start">
        <CloudOff />
        En attente du réseau
      </Badge>
    );
  }
  if (state.kind === "refused") {
    return (
      <Badge tone="bad" className="self-start">
        <TriangleAlert />
        Non enregistré
      </Badge>
    );
  }
  return (
    <Badge tone="good" className="self-start">
      <Check />
      Enregistré
    </Badge>
  );
}

/** Puts the day in the device's queue (replacing versions the server refused); returns its timestamp. */
function queueDay(userId: string, payload: DayPayload, replaces: string[]) {
  for (const id of replaces) removeEntry(id);
  const createdAt = Date.now();
  addEntry({ id: newId(), userId, createdAt, attempts: 0, payload });
  return createdAt;
}

function tone(value: number) {
  return value > 0 ? "text-good" : value < 0 ? "text-bad" : "text-ink-2";
}

function signed(value: number, money: (n: number) => string) {
  return value > 0 ? `+${money(value)}` : money(value);
}
