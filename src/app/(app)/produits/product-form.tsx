"use client";

import { useActionState, useState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/form-bits";
import { MoneyInput } from "@/components/money-input";
import { Checkbox, Field, Input } from "@/components/ui";
import { saveProduct } from "@/lib/actions/products";
import type { Product } from "@/lib/db/schema";

export function ProductForm({ product, symbol }: { product?: Product; symbol: string }) {
  const [state, action] = useActionState(saveProduct, {});
  const [hasOpening, setHasOpening] = useState(!!product?.openingDate);
  const errors = state.errors ?? {};
  const big = "h-12 text-base";

  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label="Nom du produit" htmlFor="name" error={errors.name}>
        <Input
          id="name"
          name="name"
          defaultValue={product?.name}
          placeholder="Ex. : Boissons, Riz, Crédit téléphone"
          required
          maxLength={60}
          autoFocus={!product}
          aria-invalid={errors.name ? true : undefined}
          className={big}
        />
      </Field>
      <Field
        label="Investissement de départ"
        htmlFor="investment"
        error={errors.investment}
        hint="L'argent mis au départ dans ce produit (stock, matériel…). Laissez vide si vous ne savez pas."
      >
        <MoneyInput id="investment" name="investment" defaultValue={product?.investment} suffix={symbol} />
      </Field>

      <Checkbox
        checked={hasOpening}
        onChange={(e) => setHasOpening(e.target.checked)}
        label="J'avais déjà fait un bénéfice avec ce produit avant l'application"
        description="Si vous teniez un cahier : indiquez ce bénéfice et la date du calcul. L'application continue à partir de là."
      />
      {hasOpening && (
        <div className="-mt-2 grid grid-cols-1 gap-4 rounded-2xl border border-line bg-subtle/50 p-4 sm:grid-cols-2">
          <Field label="Bénéfice déjà fait" htmlFor="openingProfit" error={errors.openingProfit}>
            <MoneyInput id="openingProfit" name="openingProfit" defaultValue={product?.openingProfit} suffix={symbol} />
          </Field>
          <Field label="Calculé le" htmlFor="openingDate" error={errors.openingDate}>
            <Input
              id="openingDate"
              name="openingDate"
              type="date"
              defaultValue={product?.openingDate ?? ""}
              aria-invalid={errors.openingDate ? true : undefined}
              className={big}
            />
          </Field>
        </div>
      )}

      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full sm:w-auto sm:self-start">
        {product ? "Enregistrer les modifications" : "Créer le produit"}
      </SubmitButton>
    </ActionForm>
  );
}
