"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/form-bits";
import { PasswordInput } from "@/components/password-input";
import { Field } from "@/components/ui";
import { resetPassword } from "@/lib/actions/password-reset";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, {});
  const e = state.errors ?? {};
  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Nouveau mot de passe" htmlFor="password" error={e.password} hint="Au moins 8 caractères.">
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required autoFocus />
      </Field>
      <Field label="Confirmer le mot de passe" htmlFor="confirm" error={e.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormMessage state={state.errors ? {} : state} />
      {state.ok === false && !state.errors && (
        <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-accent-text hover:underline">
          Demander un nouveau lien →
        </Link>
      )}
      <SubmitButton size="lg" className="w-full">
        Enregistrer et me connecter
      </SubmitButton>
    </ActionForm>
  );
}
