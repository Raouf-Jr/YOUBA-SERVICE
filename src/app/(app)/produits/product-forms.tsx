"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton, useOnSuccess } from "@/components/form-bits";
import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import { adjustStock, restock, saveProduct } from "@/lib/actions/products";
import { UNITS } from "@/lib/constants";
import type { Product } from "@/lib/db/schema";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { parseAmount } from "@/lib/forms";

const str = (v: number | null | undefined) => (v == null ? "" : String(v));

export function ProductForm({
  product,
  categories,
  currency,
  onDone,
}: {
  product?: Product;
  categories: string[];
  currency: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveProduct, {});
  const [sale, setSale] = useState(str(product?.salePrice));
  const [cost, setCost] = useState(str(product?.costPrice));
  const [track, setTrack] = useState(product?.trackStock ?? true);
  const [unit, setUnit] = useState(product?.unit ?? "pièce");
  useOnSuccess(state, onDone);
  const e = state.errors ?? {};

  const s = parseAmount(sale) ?? 0;
  const c = parseAmount(cost);
  const margin = s > 0 && c != null && !Number.isNaN(c) ? s - c : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label="Nom du produit" htmlFor="name" error={e.name}>
        <Input id="name" name="name" defaultValue={product?.name} required maxLength={80} autoFocus placeholder="Ex. Riz parfumé 25 kg" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie" htmlFor="category" error={e.category}>
          <Input id="category" name="category" defaultValue={product?.category ?? ""} list="product-categories" placeholder="Facultatif" maxLength={40} />
          <datalist id="product-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Unité" htmlFor="unit" error={e.unit}>
          <Input id="unit" name="unit" value={unit} onChange={(ev) => setUnit(ev.target.value)} list="product-units" required maxLength={20} />
          <datalist id="product-units">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix de vente" htmlFor="salePrice" error={e.salePrice}>
          <Input id="salePrice" name="salePrice" inputMode="decimal" value={sale} onChange={(ev) => setSale(ev.target.value)} required />
        </Field>
        <Field label="Prix d'achat" htmlFor="costPrice" error={e.costPrice} hint="Pour calculer la marge.">
          <Input id="costPrice" name="costPrice" inputMode="decimal" value={cost} onChange={(ev) => setCost(ev.target.value)} placeholder="Facultatif" />
        </Field>
      </div>
      {margin != null && (
        <p className="-mt-1 rounded-xl bg-subtle px-3 py-2 text-sm text-ink-2">
          Marge par {unit.trim() || "unité"} :{" "}
          <strong className={margin < 0 ? "text-bad" : "text-ink"}>{formatMoney(margin, currency)}</strong>
          {s > 0 && <> ({formatPercent(margin / s)})</>}
        </p>
      )}
      <Checkbox
        name="trackStock"
        checked={track}
        onChange={(ev) => setTrack(ev.target.checked)}
        label="Suivre le stock de ce produit"
        description="Le stock baisse automatiquement à chaque vente."
      />
      {track && (
        <div className="grid grid-cols-2 gap-3">
          {!product ? (
            <Field label="Stock actuel" htmlFor="initialStock" error={e.initialStock}>
              <Input id="initialStock" name="initialStock" inputMode="decimal" placeholder="0" />
            </Field>
          ) : (
            <div className="flex flex-col justify-end pb-2 text-sm text-ink-2">
              Stock : <strong className="text-ink">{formatNumber(product.stock)} {product.unit}</strong>
            </div>
          )}
          <Field label="Alerte si stock ≤" htmlFor="lowStockThreshold" error={e.lowStockThreshold}>
            <Input id="lowStockThreshold" name="lowStockThreshold" inputMode="decimal" defaultValue={str(product?.lowStockThreshold)} placeholder="Ex. 5" />
          </Field>
        </div>
      )}
      <FormMessage state={state.ok ? {} : state} />
      <SubmitButton size="lg" className="w-full">
        {product ? "Enregistrer les modifications" : "Ajouter le produit"}
      </SubmitButton>
    </form>
  );
}

export function RestockForm({
  product,
  todayISO,
  currency,
  onDone,
}: {
  product: Product;
  todayISO: string;
  currency: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState(restock, {});
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState(str(product.costPrice));
  useOnSuccess(state, onDone);
  const e = state.errors ?? {};
  const q = parseAmount(qty) ?? 0;
  const c = parseAmount(cost) ?? 0;
  const total = q > 0 && c > 0 ? q * c : 0;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={product.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Quantité reçue (${product.unit})`} htmlFor="quantity" error={e.quantity}>
          <Input id="quantity" name="quantity" inputMode="decimal" value={qty} onChange={(ev) => setQty(ev.target.value)} required autoFocus />
        </Field>
        <Field label="Prix d'achat unitaire" htmlFor="unitCost" error={e.unitCost}>
          <Input id="unitCost" name="unitCost" inputMode="decimal" value={cost} onChange={(ev) => setCost(ev.target.value)} />
        </Field>
      </div>
      <Field label="Date" htmlFor="date" error={e.date}>
        <Input id="date" name="date" type="date" defaultValue={todayISO} max={todayISO} required />
      </Field>
      <Checkbox
        name="recordExpense"
        defaultChecked
        label="Enregistrer l'achat dans les dépenses"
        description={
          total > 0
            ? `Une dépense « Achat de marchandises » de ${formatMoney(total, currency)} sera ajoutée.`
            : "Ajoute automatiquement une dépense « Achat de marchandises »."
        }
      />
      <Field label="Note" htmlFor="note" error={e.note}>
        <Input id="note" name="note" placeholder="Fournisseur, facture… (facultatif)" maxLength={200} />
      </Field>
      {q > 0 && (
        <p className="rounded-xl bg-subtle px-3 py-2 text-sm text-ink-2">
          Nouveau stock : <strong className="text-ink">{formatNumber(product.stock + q)} {product.unit}</strong>
        </p>
      )}
      <FormMessage state={state.ok ? {} : state} />
      <SubmitButton size="lg" className="w-full">
        Ajouter au stock
      </SubmitButton>
    </form>
  );
}

export function AdjustForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const [state, action] = useActionState(adjustStock, {});
  const [counted, setCounted] = useState(str(product.stock));
  useOnSuccess(state, onDone);
  const e = state.errors ?? {};
  const n = parseAmount(counted);
  const delta = n != null && !Number.isNaN(n) ? n - product.stock : 0;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={product.id} />
      <p className="text-sm text-ink-2">
        Stock enregistré : <strong className="text-ink">{formatNumber(product.stock)} {product.unit}</strong>. Comptez ce qu&apos;il
        reste vraiment en boutique et indiquez-le ci-dessous.
      </p>
      <Field label={`Quantité comptée (${product.unit})`} htmlFor="counted" error={e.counted}>
        <Input id="counted" name="counted" inputMode="decimal" value={counted} onChange={(ev) => setCounted(ev.target.value)} required autoFocus />
      </Field>
      {delta !== 0 && (
        <p className={`rounded-xl px-3 py-2 text-sm ${delta < 0 ? "bg-warn-soft text-warn" : "bg-subtle text-ink-2"}`}>
          Écart : {delta > 0 ? "+" : ""}
          {formatNumber(delta)} {product.unit}
          {delta < 0 && " (perte, casse ou oubli de saisie ?)"}
        </p>
      )}
      <Field label="Motif" htmlFor="adjust-note" error={e.note}>
        <Textarea id="adjust-note" name="note" placeholder="Ex. inventaire de fin de mois, produit abîmé…" maxLength={200} rows={2} />
      </Field>
      <FormMessage state={state.ok ? {} : state} />
      <SubmitButton size="lg" className="w-full">
        Enregistrer l&apos;inventaire
      </SubmitButton>
    </form>
  );
}
