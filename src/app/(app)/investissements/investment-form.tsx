"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { ActionForm, ConfirmAction, FormMessage, Modal, SubmitButton, useOnSuccess } from "@/components/form-bits";
import { Field, IconButton, Input, Select } from "@/components/ui";
import { deleteInvestment, saveInvestment } from "@/lib/actions/expenses";
import { INVESTMENT_CATEGORIES } from "@/lib/constants";

export type InvestmentValues = { id: string; date: string; label: string; category: string; amount: number };

export function InvestmentForm({
  investment,
  todayISO,
  onDone,
}: {
  investment?: InvestmentValues;
  todayISO: string;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(saveInvestment, {});
  const [formKey, setFormKey] = useState(0);
  useOnSuccess(state, () => (onDone ? onDone() : setFormKey((k) => k + 1)));
  const e = state.errors ?? {};
  const id = investment?.id ?? "new";
  const categories: string[] = [...INVESTMENT_CATEGORIES];
  if (investment && !categories.includes(investment.category)) categories.push(investment.category);

  return (
    <ActionForm key={formKey} action={action} className="flex flex-col gap-4">
      {investment && <input type="hidden" name="id" value={investment.id} />}
      <Field label="Libellé" htmlFor={`label-${id}`} error={e.label}>
        <Input id={`label-${id}`} name="label" defaultValue={investment?.label} required maxLength={80} placeholder="Ex. Congélateur, étagères, travaux…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie" htmlFor={`cat-${id}`} error={e.category}>
          <Select id={`cat-${id}`} name="category" defaultValue={investment?.category ?? INVESTMENT_CATEGORIES[0]}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Montant" htmlFor={`amount-${id}`} error={e.amount}>
          <Input id={`amount-${id}`} name="amount" inputMode="decimal" defaultValue={investment?.amount} required className="tabular" placeholder="0" />
        </Field>
      </div>
      <Field label="Date" htmlFor={`date-${id}`} error={e.date}>
        <Input id={`date-${id}`} name="date" type="date" defaultValue={investment?.date ?? todayISO} max={todayISO} required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full">
        {investment ? "Enregistrer les modifications" : "Ajouter l'investissement"}
      </SubmitButton>
    </ActionForm>
  );
}

export function InvestmentRowActions({ investment, todayISO }: { investment: InvestmentValues; todayISO: string }) {
  return (
    <div className="flex shrink-0 items-center">
      <Modal
        title="Modifier l'investissement"
        trigger={(open) => (
          <IconButton label="Modifier" onClick={open}>
            <Pencil />
          </IconButton>
        )}
      >
        {(close) => <InvestmentForm investment={investment} todayISO={todayISO} onDone={close} />}
      </Modal>
      <ConfirmAction
        action={deleteInvestment.bind(null, investment.id)}
        confirm={`Supprimer l'investissement « ${investment.label} » ?`}
        label="Supprimer"
      >
        <Trash2 />
      </ConfirmAction>
    </div>
  );
}
