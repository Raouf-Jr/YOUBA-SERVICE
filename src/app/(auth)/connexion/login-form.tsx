"use client";

import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/form-bits";
import { PasswordInput } from "@/components/password-input";
import { Field, Input } from "@/components/ui";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action] = useActionState(login, {});
  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      <Field label="Identifiant" htmlFor="username" error={state.errors?.username}>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
          className="h-12 text-base"
        />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={state.errors?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required className="h-12 text-base" />
      </Field>
      <FormMessage state={state.ok === false && !state.errors ? state : {}} />
      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </ActionForm>
  );
}
