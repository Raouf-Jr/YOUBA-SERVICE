"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { PasswordInput } from "@/components/password-input";
import { Field, Input } from "@/components/ui";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action] = useActionState(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Adresse e-mail" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={state.errors?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state.ok === false && !state.errors ? state : {}} />
      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </form>
  );
}
