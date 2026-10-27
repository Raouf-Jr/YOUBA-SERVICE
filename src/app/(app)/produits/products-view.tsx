"use client";

import { Archive, ArchiveRestore, ClipboardList, Package, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmAction, Modal } from "@/components/form-bits";
import { Badge, Button, EmptyState, IconButton, cx, inputClass } from "@/components/ui";
import { archiveProduct, deleteProduct } from "@/lib/actions/products";
import type { Product } from "@/lib/db/schema";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { AdjustForm, ProductForm, RestockForm } from "./product-forms";

type Filter = "tous" | "alerte" | "archives";

const isLow = (p: Product) => p.trackStock && p.stock <= (p.lowStockThreshold ?? 0);

export function ProductsView({
  products,
  categories,
  currency,
  todayISO,
  isOwner,
  initialFilter,
}: {
  products: Product[];
  categories: string[];
  currency: string;
  todayISO: string;
  isOwner: boolean;
  initialFilter: Filter;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const money = (v: number) => formatMoney(v, currency);

  const active = products.filter((p) => !p.archived);
  const archivedCount = products.length - active.length;
  const lowCount = active.filter(isLow).length;

  const visible = useMemo(() => {
    const q = query.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    return products.filter((p) => {
      if (filter === "archives" ? !p.archived : p.archived) return false;
      if (filter === "alerte" && !isLow(p)) return false;
      if (!q) return true;
      const hay = `${p.name} ${p.category ?? ""}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      return hay.includes(q);
    });
  }, [products, query, filter]);

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "tous", label: "Tous", count: active.length },
    { key: "alerte", label: "Stock bas", count: lowCount },
    ...(archivedCount ? [{ key: "archives" as const, label: "Archivés", count: archivedCount }] : []),
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              aria-pressed={filter === t.key}
              className={cx(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                filter === t.key ? "border-transparent bg-ink text-card" : "border-line text-ink-2 hover:text-ink",
              )}
            >
              {t.label}
              <span className={cx("tabular text-xs", filter === t.key ? "opacity-70" : "text-muted")}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher un produit"
              className={cx(inputClass, "h-10 pl-9 text-sm")}
            />
          </div>
          {isOwner && (
            <Modal
              title="Nouveau produit"
              trigger={(open) => (
                <Button onClick={open}>
                  <Plus /> <span className="hidden sm:inline">Nouveau produit</span>
                  <span className="sm:hidden">Ajouter</span>
                </Button>
              )}
            >
              {(close) => <ProductForm categories={categories} currency={currency} onDone={close} />}
            </Modal>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Package className="size-5" />}
          title={products.length === 0 ? "Votre catalogue est vide" : "Aucun produit ici"}
        >
          {products.length === 0
            ? "Ajoutez les produits que vous vendez avec leur prix de vente et d'achat."
            : filter === "alerte"
              ? "Aucun produit sous son seuil d'alerte. 👍"
              : "Essayez une autre recherche."}
        </EmptyState>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))_auto] gap-4 border-b border-line px-5 py-2.5 text-xs font-medium text-muted md:grid">
            <span>Produit</span>
            <span className="text-right">Prix de vente</span>
            <span className="text-right">{isOwner ? "Marge" : ""}</span>
            <span className="text-right">Stock</span>
            <span className="w-[10.5rem]" />
          </div>
          <ul className="divide-y divide-line">
            {visible.map((p) => {
              const margin = p.costPrice != null ? p.salePrice - p.costPrice : null;
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5 md:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))_auto]"
                >
                  <div className="min-w-0">
                    <p className={cx("truncate font-medium", p.archived ? "text-muted" : "text-ink")}>{p.name}</p>
                    <p className="truncate text-xs text-muted">
                      {p.category ?? "Sans catégorie"} · par {p.unit}
                    </p>
                  </div>
                  <div className="tabular text-right text-sm md:order-none">
                    <span className="font-medium text-ink">{money(p.salePrice)}</span>
                    {p.costPrice != null && <span className="block text-xs text-muted md:hidden">achat {money(p.costPrice)}</span>}
                  </div>
                  <div className="tabular hidden text-right text-sm md:block">
                    {!isOwner ? null : margin != null ? (
                      <>
                        <span className={margin < 0 ? "text-bad" : "text-ink"}>{money(margin)}</span>
                        <span className="block text-xs text-muted">{formatPercent(p.salePrice ? margin / p.salePrice : 0)}</span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                  <div className="text-left md:text-right">
                    {p.trackStock ? (
                      <Badge tone={p.stock <= 0 ? "bad" : isLow(p) ? "warn" : "neutral"} className="tabular">
                        {p.stock <= 0 ? "Rupture" : `${formatNumber(p.stock)} ${p.unit}`}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted">Non suivi</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-0.5 md:w-[10.5rem]">
                    {!p.archived && (
                      <>
                        <Modal
                          title="Réapprovisionner"
                          description={p.name}
                          trigger={(open) => (
                            <IconButton label="Réapprovisionner" onClick={open}>
                              <PackagePlus />
                            </IconButton>
                          )}
                        >
                          {(close) => <RestockForm product={p} todayISO={todayISO} currency={currency} onDone={close} />}
                        </Modal>
                        <Modal
                          title="Inventaire"
                          description={p.name}
                          trigger={(open) => (
                            <IconButton label="Faire l'inventaire" onClick={open}>
                              <ClipboardList />
                            </IconButton>
                          )}
                        >
                          {(close) => <AdjustForm product={p} onDone={close} />}
                        </Modal>
                      </>
                    )}
                    {isOwner && (
                      <>
                        {!p.archived && (
                          <Modal
                            title="Modifier le produit"
                            trigger={(open) => (
                              <IconButton label="Modifier" onClick={open}>
                                <Pencil />
                              </IconButton>
                            )}
                          >
                            {(close) => <ProductForm product={p} categories={categories} currency={currency} onDone={close} />}
                          </Modal>
                        )}
                        <ConfirmAction
                          action={archiveProduct.bind(null, p.id, !p.archived)}
                          label={p.archived ? "Remettre en vente" : "Archiver (ne plus vendre)"}
                        >
                          {p.archived ? <ArchiveRestore /> : <Archive />}
                        </ConfirmAction>
                        {p.archived && (
                          <ConfirmAction
                            action={deleteProduct.bind(null, p.id)}
                            confirm={`Supprimer définitivement « ${p.name} » ? L'historique des ventes est conservé.`}
                            label="Supprimer définitivement"
                          >
                            <Trash2 />
                          </ConfirmAction>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
