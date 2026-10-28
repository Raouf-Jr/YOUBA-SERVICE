"use client";

import { Trash2 } from "lucide-react";
import { useOffline } from "next/offline";
import { useActionState, useState, useTransition } from "react";
import { ActionForm, FormMessage, Spinner, SubmitButton, useOnSuccess } from "@/components/form-bits";
import { MoneyInput } from "@/components/money-input";
import { Field, Input } from "@/components/ui";
import { addGeneralExpense, deleteGeneralExpense } from "@/lib/actions/general-expenses";

export function GeneralExpenseForm({ today, symbol }: { today: string; symbol: string }) {
  const [state, action] = useActionState(addGeneralExpense, {});
  const offline = useOffline();
  // A fresh, empty form after each expense.
  const [key, setKey] = useState(0);
  useOnSuccess(state, () => setKey((k) => k + 1));
  const e = state.errors ?? {};
  return (
    <ActionForm key={key} action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1.4fr_auto]">
      <Field label="Montant" htmlFor="ge-amount" error={e.amount}>
        <MoneyInput id="ge-amount" name="amount" suffix={symbol} required aria-invalid={e.amount ? true : undefined} />
      </Field>
      <Field label="Motif" htmlFor="ge-label" error={e.label}>
        <Input
          id="ge-label"
          name="label"
          required
          maxLength={80}
          placeholder="Ex. : loyer, électricité, maison"
          aria-invalid={e.label ? true : undefined}
          className="h-12 text-base"
        />
      </Field>
      <Field label="Date" htmlFor="ge-date" error={e.date}>
        <Input id="ge-date" name="date" type="date" defaultValue={today} max={today} required className="h-12 text-base sm:w-44" />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-3">
        <FormMessage state={state} />
        {offline && <p className="text-sm text-warn">Pas de réseau : enregistrez cette dépense quand le réseau revient.</p>}
        <SubmitButton size="lg" className="w-full sm:w-auto sm:self-start" disabled={offline}>
          Enregistrer la dépense
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteGeneralExpense({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Supprimer la dépense « ${label} »`}
      title="Supprimer"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Supprimer la dépense « ${label} » ?`)) start(() => deleteGeneralExpense(id));
      }}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-bad-soft hover:text-bad disabled:opacity-50"
    >
      {pending ? <Spinner /> : <Trash2 className="size-4" />}
    </button>
  );
}
