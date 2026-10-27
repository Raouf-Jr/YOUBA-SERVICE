"use client";

import { useActionState, useSyncExternalStore } from "react";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { PasswordInput } from "@/components/password-input";
import { Field, Input, Select } from "@/components/ui";
import { signup } from "@/lib/actions/auth";
import { CURRENCIES } from "@/lib/constants";

const subscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SignupForm() {
  const [state, action] = useActionState(signup, {});
  // The shop's "today" follows the owner's time zone, detected from the browser.
  const timeZone = useSyncExternalStore(subscribe, browserTimeZone, () => "");
  const e = state.errors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nom de la boutique" htmlFor="shopName" error={e.shopName}>
        <Input id="shopName" name="shopName" placeholder="Ex. Boutique Youba" required autoFocus maxLength={80} />
      </Field>
      <Field label="Votre nom" htmlFor="name" error={e.name}>
        <Input id="name" name="name" autoComplete="name" placeholder="Ex. Aminata Diallo" required maxLength={80} />
      </Field>
      <Field label="Adresse e-mail" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={e.password} hint="Au moins 8 caractères.">
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Devise" htmlFor="currency" error={e.currency}>
        <Select id="currency" name="currency" defaultValue="XOF">
          {CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <input type="hidden" name="timezone" value={timeZone} />
      <FormMessage state={state.ok === false && !state.errors ? state : {}} />
      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Création…">
        Créer ma boutique
      </SubmitButton>
    </form>
  );
}
