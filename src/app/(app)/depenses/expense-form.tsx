"use client";

import { useOffline } from "next/offline";
import { useActionState, useState, useSyncExternalStore, type FormEvent } from "react";
import { ActionForm, FormMessage, SubmitButton, useOnSuccess } from "@/components/form-bits";
import { Button, Field, Input, cx } from "@/components/ui";
import { saveExpense } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { isISODate, today } from "@/lib/dates";
import { parseAmount, type FormState } from "@/lib/forms";
import { addEntry, newId } from "@/lib/offline/outbox";
import { syncOutbox } from "@/lib/offline/sync";

export type ExpenseValues = {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
};

const noSubscribe = () => () => {};

/**
 * New expense. Saved on the device first, then sent to the server (right away, or when the
 * network comes back), so it works offline too.
 */
export function NewExpenseForm({
  defaultDate,
  serverToday,
  timezone,
  userId,
  shopId,
}: {
  defaultDate: string;
  serverToday: string;
  timezone: string;
  userId: string;
  shopId: string;
}) {
  const offline = useOffline();
  const [state, setState] = useState<FormState>({});
  const [formKey, setFormKey] = useState(0);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  // The page may be an offline copy from an earlier day: "today" comes from the device.
  const deviceToday = useSyncExternalStore(noSubscribe, () => today(timezone), () => serverToday);
  const dateDefault = defaultDate === serverToday ? deviceToday : defaultDate;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = parseAmount(form.get("amount"));
    const date = String(form.get("date") ?? "");
    const description = String(form.get("description") ?? "").trim().slice(0, 200) || null;
    const errors: Record<string, string> = {};
    if (amount == null) errors.amount = "Le montant est obligatoire";
    else if (Number.isNaN(amount) || amount <= 0 || amount > 1e11) errors.amount = "Montant invalide";
    if (!isISODate(date) || date > deviceToday) errors.date = "Date invalide";
    if (amount == null || Object.keys(errors).length) {
      return setState({ ok: false, errors, message: "Vérifiez les champs en rouge." });
    }

    const clientRef = newId();
    addEntry({
      id: clientRef,
      kind: "expense",
      userId,
      shopId,
      createdAt: Date.now(),
      attempts: 0,
      payload: { clientRef, shopId, date, category, amount, description },
      summary: { label: description || category },
    });
    void syncOutbox(userId);
    setFormKey((k) => k + 1);
    setState((prev) => ({
      ok: true,
      stamp: (prev.stamp ?? 0) + 1,
      message: offline ? "Dépense gardée sur l'appareil : elle sera envoyée dès le retour du réseau." : "Dépense enregistrée.",
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <form key={formKey} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <ExpenseFields
          idSuffix="new"
          category={category}
          onCategory={setCategory}
          errors={state.errors}
          dateDefault={dateDefault}
          maxDate={deviceToday}
        />
        <Button type="submit" size="lg" className="w-full">
          Ajouter la dépense
        </Button>
      </form>
      <FormMessage state={state} className="empty:hidden" />
    </div>
  );
}

/** Editing an existing expense (owner only, online). */
export function EditExpenseForm({ expense, maxDate, onDone }: { expense: ExpenseValues; maxDate: string; onDone: () => void }) {
  const [state, action] = useActionState(saveExpense, {});
  const [category, setCategory] = useState(expense.category);
  useOnSuccess(state, onDone);

  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={expense.id} />
      <ExpenseFields
        idSuffix={expense.id}
        category={category}
        onCategory={setCategory}
        errors={state.errors}
        dateDefault={expense.date}
        maxDate={maxDate}
        expense={expense}
      />
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full">
        Enregistrer les modifications
      </SubmitButton>
    </ActionForm>
  );
}

function ExpenseFields({
  idSuffix,
  category,
  onCategory,
  errors = {},
  dateDefault,
  maxDate,
  expense,
}: {
  idSuffix: string;
  category: string;
  onCategory: (category: string) => void;
  errors?: Record<string, string>;
  dateDefault: string;
  maxDate: string;
  expense?: ExpenseValues;
}) {
  const categories: string[] = EXPENSE_CATEGORIES.includes(category as never) ? [...EXPENSE_CATEGORIES] : [...EXPENSE_CATEGORIES, category];
  return (
    <>
      <fieldset className="min-w-0">
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
                onChange={() => onCategory(c)}
                className="sr-only"
              />
              {c}
            </label>
          ))}
        </div>
        {errors.category && <p className="mt-1 text-sm text-bad">{errors.category}</p>}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant" htmlFor={`amount-${idSuffix}`} error={errors.amount}>
          <Input
            id={`amount-${idSuffix}`}
            name="amount"
            inputMode="decimal"
            defaultValue={expense?.amount}
            aria-invalid={!!errors.amount || undefined}
            required
            placeholder="0"
            className="tabular"
          />
        </Field>
        <Field label="Date" htmlFor={`date-${idSuffix}`} error={errors.date}>
          <Input
            key={dateDefault}
            id={`date-${idSuffix}`}
            name="date"
            type="date"
            defaultValue={dateDefault}
            max={maxDate}
            aria-invalid={!!errors.date || undefined}
            required
          />
        </Field>
      </div>
      <Field label="Description" htmlFor={`desc-${idSuffix}`} error={errors.description}>
        <Input
          id={`desc-${idSuffix}`}
          name="description"
          defaultValue={expense?.description ?? ""}
          placeholder="Ex. facture d'électricité de mars (facultatif)"
          maxLength={200}
        />
      </Field>
    </>
  );
}
