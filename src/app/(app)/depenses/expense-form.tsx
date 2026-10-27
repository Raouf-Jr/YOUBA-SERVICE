"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton, useOnSuccess } from "@/components/form-bits";
import { Field, Input, cx } from "@/components/ui";
import { saveExpense } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export type ExpenseValues = {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
};

export function ExpenseForm({
  expense,
  defaultDate,
  maxDate,
  onDone,
}: {
  expense?: ExpenseValues;
  defaultDate: string;
  maxDate: string;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(saveExpense, {});
  const [formKey, setFormKey] = useState(0);
  const [category, setCategory] = useState(expense?.category ?? EXPENSE_CATEGORIES[0]);
  useOnSuccess(state, () => {
    if (onDone) onDone();
    else setFormKey((k) => k + 1);
  });
  const e = state.errors ?? {};
  const categories: string[] = EXPENSE_CATEGORIES.includes(category as never) ? [...EXPENSE_CATEGORIES] : [...EXPENSE_CATEGORIES, category];

  return (
    <form key={formKey} action={action} className="flex flex-col gap-4">
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-2">Catégorie</legend>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <label
              key={c}
              className={cx(
                "inline-flex h-9 cursor-pointer items-center rounded-full border px-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent",
                category === c
                  ? "border-transparent bg-[var(--series-expenses)] font-medium text-white"
                  : "border-line text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              <input
                type="radio"
                name="category"
                value={c}
                checked={category === c}
                onChange={() => setCategory(c)}
                className="sr-only"
              />
              {c}
            </label>
          ))}
        </div>
        {e.category && <p className="mt-1 text-sm text-bad">{e.category}</p>}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant" htmlFor={`amount-${expense?.id ?? "new"}`} error={e.amount}>
          <Input
            id={`amount-${expense?.id ?? "new"}`}
            name="amount"
            inputMode="decimal"
            defaultValue={expense?.amount}
            required
            placeholder="0"
            className="tabular"
          />
        </Field>
        <Field label="Date" htmlFor={`date-${expense?.id ?? "new"}`} error={e.date}>
          <Input id={`date-${expense?.id ?? "new"}`} name="date" type="date" defaultValue={expense?.date ?? defaultDate} max={maxDate} required />
        </Field>
      </div>
      <Field label="Description" htmlFor={`desc-${expense?.id ?? "new"}`} error={e.description}>
        <Input
          id={`desc-${expense?.id ?? "new"}`}
          name="description"
          defaultValue={expense?.description ?? ""}
          placeholder="Ex. facture d'électricité de mars (facultatif)"
          maxLength={200}
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full">
        {expense ? "Enregistrer les modifications" : "Ajouter la dépense"}
      </SubmitButton>
    </form>
  );
}
