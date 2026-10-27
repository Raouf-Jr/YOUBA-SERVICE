"use client";

import { Minus, Package, Plus, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useOffline } from "next/offline";
import { useMemo, useState, type FormEvent } from "react";
import { FormMessage } from "@/components/form-bits";
import { Button, EmptyState, cx, inputClass } from "@/components/ui";
import { PAYMENT_METHODS } from "@/lib/constants";
import { today } from "@/lib/dates";
import { formatMoney, formatNumber } from "@/lib/format";
import { parseAmount, type FormState } from "@/lib/forms";
import { addEntry, newId, useOutbox } from "@/lib/offline/outbox";
import { syncOutbox } from "@/lib/offline/sync";

export type EntryProduct = {
  id: string;
  name: string;
  category: string | null;
  salePrice: number;
  unit: string;
  trackStock: boolean;
  stock: number;
};

const num = (v: string | undefined) => {
  const n = parseAmount(v ?? "");
  return n != null && Number.isFinite(n) && n > 0 ? n : 0;
};

/** Saves the checkout on the device, then tries to send it. */
function queueCheckout(input: {
  userId: string;
  shopId: string;
  date: string;
  paymentMethod: string;
  lines: { productId: string; quantity: number; unitPrice: number }[];
  summary: { total: number; items: number; label: string };
}) {
  const checkoutId = newId();
  addEntry({
    id: checkoutId,
    kind: "sale",
    userId: input.userId,
    shopId: input.shopId,
    createdAt: Date.now(),
    attempts: 0,
    payload: { checkoutId, shopId: input.shopId, date: input.date, paymentMethod: input.paymentMethod, lines: input.lines },
    summary: input.summary,
  });
  void syncOutbox(input.userId);
}

export function SalesEntry({
  products,
  date,
  isToday,
  currency,
  canManageProducts,
  userId,
  shopId,
  timezone,
}: {
  products: EntryProduct[];
  date: string;
  /** The page shows today: use the device's date at the moment of the sale (the page may be an offline copy). */
  isToday: boolean;
  currency: string;
  canManageProducts: boolean;
  userId: string;
  shopId: string;
  timezone: string;
}) {
  const offline = useOffline();
  // Sales still waiting to be sent already left the shelf.
  const outbox = useOutbox(userId);
  const waitingQty = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of outbox) {
      if (e.kind !== "sale" || e.error) continue;
      for (const l of e.payload.lines) map.set(l.productId, (map.get(l.productId) ?? 0) + l.quantity);
    }
    return map;
  }, [outbox]);
  const [state, setState] = useState<FormState & { errors?: Record<string, string> }>({});
  const [qty, setQty] = useState<Record<string, string>>({});
  const [price, setPrice] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [method, setMethod] = useState("especes");

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "fr")),
    [products],
  );

  const normalized = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const visible = products.filter(
    (p) => (!category || p.category === category) && (!query || normalized(p.name).includes(normalized(query))),
  );

  const unitPrice = (p: EntryProduct) => (price[p.id] !== undefined ? num(price[p.id]) : p.salePrice);
  const selected = products.filter((p) => num(qty[p.id]) > 0);
  const total = selected.reduce((sum, p) => sum + num(qty[p.id]) * unitPrice(p), 0);
  const items = selected.reduce((sum, p) => sum + num(qty[p.id]), 0);

  /**
   * The sale is saved on the device first (instant, works offline), then sent to the server;
   * its checkout id makes sure it is only ever counted once.
   */
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const lines = selected.map((p) => {
      const rawPrice = price[p.id];
      const unit = rawPrice !== undefined ? parseAmount(rawPrice) : p.salePrice;
      if (unit == null || !Number.isFinite(unit) || unit < 0) errors[`price:${p.id}`] = "Prix invalide";
      return { productId: p.id, quantity: num(qty[p.id]), unitPrice: unit ?? 0 };
    });
    if (Object.keys(errors).length) return setState({ ok: false, errors, message: "Vérifiez les prix en rouge." });
    if (lines.length === 0) return setState({ ok: false, message: "Indiquez au moins une quantité vendue." });

    queueCheckout({
      userId,
      shopId,
      date: isToday ? today(timezone) : date,
      paymentMethod: method,
      lines,
      summary: {
        total,
        items,
        label: selected.map((p) => p.name).slice(0, 2).join(", ") + (selected.length > 2 ? ` +${selected.length - 2}` : ""),
      },
    });
    setQty({});
    setPrice({});
    setState((prev) => ({
      ok: true,
      stamp: (prev.stamp ?? 0) + 1,
      message: offline
        ? "Vente gardée sur l'appareil : elle sera envoyée dès le retour du réseau."
        : lines.length > 1
          ? `${lines.length} produits enregistrés.`
          : "Vente enregistrée.",
    }));
  };

  const step = (id: string, delta: number) =>
    setQty((q) => {
      const next = Math.max(0, Math.round((num(q[id]) + delta) * 1000) / 1000);
      return { ...q, [id]: next ? String(next) : "" };
    });

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-5" />}
        title="Aucun produit pour le moment"
        action={
          canManageProducts ? (
            <Link href="/produits" className="font-medium text-accent-text hover:underline">
              Ajouter mes produits →
            </Link>
          ) : undefined
        }
      >
        {canManageProducts
          ? "Créez d'abord les produits que vous vendez, avec leur prix."
          : "Demandez au propriétaire d'ajouter les produits de la boutique."}
      </EmptyState>
    );
  }

  return (
    <form onSubmit={submit} noValidate>

      <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5">
        {products.length > 6 && (
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              aria-label="Rechercher un produit"
              className={cx(inputClass, "pl-10")}
            />
          </div>
        )}
        {categories.length > 1 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-5 sm:px-5">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cx(
                  "h-8 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors",
                  category === c ? "border-transparent bg-ink text-card" : "border-line bg-card text-ink-2 hover:text-ink",
                )}
              >
                {c ?? "Tous"}
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="mt-3 divide-y divide-line border-y border-line">
        {visible.map((p) => {
          const q = num(qty[p.id]);
          const stock = Math.round((p.stock - (waitingQty.get(p.id) ?? 0)) * 1000) / 1000;
          const short = p.trackStock && q > stock;
          return (
            <li key={p.id} className={cx("px-4 py-3 transition-colors sm:px-5", q > 0 && "bg-accent-soft/45")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate font-medium text-ink">{p.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    {p.trackStock ? (
                      <span className={cx(stock <= 0 ? "text-bad" : short ? "text-warn" : undefined)}>
                        Stock : {formatNumber(stock)} {p.unit}
                      </span>
                    ) : (
                      <span>par {p.unit}</span>
                    )}
                    {short && <TriangleAlert className="size-3.5 text-warn" aria-label="Stock insuffisant" />}
                  </p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <label className="relative flex-1 sm:flex-none">
                    <span className="sr-only">Prix unitaire de {p.name}</span>
                    <input
                      name={`price:${p.id}`}
                      inputMode="decimal"
                      value={price[p.id] ?? String(p.salePrice)}
                      onChange={(e) => setPrice((pr) => ({ ...pr, [p.id]: e.target.value }))}
                      aria-invalid={!!state.errors?.[`price:${p.id}`] || undefined}
                      className={cx(inputClass, "tabular h-10 rounded-lg px-2.5 text-right text-sm sm:w-28!")}
                    />
                  </label>
                  <div className="flex items-center rounded-xl border border-line-strong bg-card">
                    <button
                      type="button"
                      onClick={() => step(p.id, -1)}
                      disabled={q === 0}
                      aria-label={`Retirer un ${p.name}`}
                      className="flex size-10 items-center justify-center rounded-l-xl text-ink-2 hover:bg-subtle disabled:opacity-35"
                    >
                      <Minus className="size-4" />
                    </button>
                    <input
                      name={`qty:${p.id}`}
                      inputMode="decimal"
                      value={qty[p.id] ?? ""}
                      placeholder="0"
                      onChange={(e) => setQty((qs) => ({ ...qs, [p.id]: e.target.value }))}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Quantité vendue de ${p.name}`}
                      aria-invalid={!!state.errors?.[`qty:${p.id}`] || undefined}
                      className="tabular h-10 w-12 border-x border-line bg-transparent text-center font-semibold text-ink placeholder:font-normal placeholder:text-muted focus:outline-none aria-invalid:text-bad"
                    />
                    <button
                      type="button"
                      onClick={() => step(p.id, 1)}
                      aria-label={`Ajouter un ${p.name}`}
                      className="flex size-10 items-center justify-center rounded-r-xl text-ink-2 hover:bg-subtle"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
              {q > 0 && (
                <p className="tabular mt-1.5 text-right text-xs text-ink-2">
                  {formatNumber(q)} × {formatMoney(unitPrice(p), currency)} ={" "}
                  <span className="font-semibold text-ink">{formatMoney(q * unitPrice(p), currency)}</span>
                </p>
              )}
            </li>
          );
        })}
        {visible.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">Aucun produit trouvé.</li>}
      </ul>

      {/* Checkout bar: sticks above the mobile tab bar */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 rounded-b-2xl border-t border-line bg-card/95 px-4 pt-3 pb-4 backdrop-blur sm:px-5 lg:bottom-0">
        <div className="mb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label="Mode de paiement">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={method === m.value}
              onClick={() => setMethod(m.value)}
              className={cx(
                "h-8 shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors",
                method === m.value
                  ? "border-accent bg-accent-soft text-accent-text"
                  : "border-line text-ink-2 hover:bg-subtle hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <FormMessage state={state} className="mb-3 empty:hidden" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              {items > 0 ? `${formatNumber(items)} article${items > 1 ? "s" : ""}` : "Aucun article"}
            </p>
            <p className="tabular truncate text-xl font-semibold tracking-tight text-ink">{formatMoney(total, currency)}</p>
          </div>
          <Button type="submit" size="lg" className="shrink-0">
            Enregistrer
          </Button>
        </div>
      </div>
    </form>
  );
}
