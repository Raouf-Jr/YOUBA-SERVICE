"use client";

import Form from "next/form";
import { Select } from "@/components/ui";

/** Product filter: keeps the period and applies as soon as a product is picked. */
export function ProductSelect({
  products,
  value,
  keep,
}: {
  products: { id: string; name: string; archived: boolean }[];
  value?: string;
  keep: Record<string, string>;
}) {
  return (
    <Form action="/rapports" scroll={false} className="flex min-w-0 flex-col gap-1">
      {Object.entries(keep).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="produit" className="text-xs font-medium text-muted">
        Produit
      </label>
      <Select
        id="produit"
        name="produit"
        defaultValue={value ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 text-sm sm:w-56"
      >
        <option value="">Tous les produits</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.archived ? " (plus vendu)" : ""}
          </option>
        ))}
      </Select>
      <noscript>
        <button type="submit" className="mt-1 text-sm underline">
          Voir
        </button>
      </noscript>
    </Form>
  );
}
