"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/components/form-bits";
import { Field, Input } from "@/components/ui";
import { requestPasswordReset } from "@/lib/actions/password-reset";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, {});

  if (state.ok) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-accent-soft/60 px-5 py-6 text-center" role="status">
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-card text-accent-text">
          <MailCheck className="size-5" />
        </span>
        <p className="font-medium text-ink">Vérifiez votre boîte mail</p>
        <p className="mt-1 text-sm text-ink-2">{state.message}</p>
      </div>
    );
  }

  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      <Field label="Adresse e-mail" htmlFor="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
      </Field>
      <FormMessage state={state.errors ? {} : state} />
      <SubmitButton size="lg" className="w-full" pendingLabel="Envoi…">
        Envoyer le lien
      </SubmitButton>
    </ActionForm>
  );
}
