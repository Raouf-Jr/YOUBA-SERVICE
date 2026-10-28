"use client";

import { useActionState, useState } from "react";
import { ActionForm, FormMessage, SubmitButton, useOnSuccess } from "@/components/form-bits";
import { PasswordInput } from "@/components/password-input";
import { Field, Input, Select } from "@/components/ui";
import { changePassword, saveShop } from "@/lib/actions/settings";
import { CURRENCIES } from "@/lib/constants";

export function ShopForm({ shopName, currency }: { shopName: string; currency: string }) {
  const [state, action] = useActionState(saveShop, {});
  const e = state.errors ?? {};
  return (
    <ActionForm action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nom de la boutique" htmlFor="shopName" error={e.shopName}>
        <Input id="shopName" name="shopName" defaultValue={shopName} required maxLength={60} className="h-12 text-base" />
      </Field>
      <Field label="Monnaie" htmlFor="currency" error={e.currency}>
        <Select id="currency" name="currency" defaultValue={currency} className="h-12 text-base">
          {CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton className="self-start">Enregistrer</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, {});
  // A fresh, empty form after each successful change.
  const [key, setKey] = useState(0);
  useOnSuccess(state, () => setKey((k) => k + 1));
  const e = state.errors ?? {};
  return (
    <ActionForm key={key} action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Mot de passe actuel" htmlFor="current" error={e.current} className="sm:col-span-2">
        <PasswordInput id="current" name="current" autoComplete="current-password" required className="h-12 text-base" />
      </Field>
      <Field label="Nouveau mot de passe" htmlFor="next" error={e.next} hint="8 caractères au moins.">
        <PasswordInput id="next" name="next" autoComplete="new-password" required minLength={8} className="h-12 text-base" />
      </Field>
      <Field label="Encore une fois" htmlFor="confirm" error={e.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required className="h-12 text-base" />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton className="self-start">Changer le mot de passe</SubmitButton>
      </div>
    </ActionForm>
  );
}
