"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { ConfirmAction, FormMessage, Modal, SubmitButton, useOnSuccess } from "@/components/form-bits";
import { PasswordInput } from "@/components/password-input";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { addStaff, changePassword, removeStaff, saveProfile, saveShop } from "@/lib/actions/settings";
import { CURRENCIES, TIMEZONES } from "@/lib/constants";

export function ShopForm({
  shop,
}: {
  shop: { name: string; currency: string; timezone: string; monthlyGoal: number | null };
}) {
  const [state, action] = useActionState(saveShop, {});
  const e = state.errors ?? {};
  const zones: string[] = TIMEZONES.includes(shop.timezone as never) ? [...TIMEZONES] : [shop.timezone, ...TIMEZONES];
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom de la boutique" htmlFor="shop-name" error={e.name} className="sm:col-span-2">
        <Input id="shop-name" name="name" defaultValue={shop.name} required maxLength={80} />
      </Field>
      <Field label="Devise" htmlFor="shop-currency" error={e.currency}>
        <Select id="shop-currency" name="currency" defaultValue={shop.currency}>
          {CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Fuseau horaire" htmlFor="shop-tz" error={e.timezone} hint="Détermine la date « d'aujourd'hui ».">
        <Select id="shop-tz" name="timezone" defaultValue={shop.timezone}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Objectif de ventes mensuel"
        htmlFor="objectif"
        error={e.monthlyGoal}
        hint="Laissez vide pour ne pas suivre d'objectif."
        className="sm:col-span-2"
      >
        <Input id="objectif" name="monthlyGoal" inputMode="decimal" defaultValue={shop.monthlyGoal ?? ""} placeholder="Ex. 1 500 000" className="tabular" />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton className="self-start">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(saveProfile, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Votre nom" htmlFor="profile-name" error={state.errors?.name}>
        <Input id="profile-name" name="name" defaultValue={name} required maxLength={80} autoComplete="name" />
      </Field>
      <Field label="Adresse e-mail" htmlFor="profile-email" hint="Sert à vous connecter.">
        <Input id="profile-email" value={email} disabled readOnly />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton className="self-start">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, {});
  const [key, setKey] = useState(0);
  useOnSuccess(state, () => setKey((k) => k + 1));
  const e = state.errors ?? {};
  return (
    <div>
      <form key={key} action={action} className="grid gap-4 sm:grid-cols-3">
        <Field label="Mot de passe actuel" htmlFor="pw-current" error={e.current}>
          <PasswordInput id="pw-current" name="current" autoComplete="current-password" required />
        </Field>
        <Field label="Nouveau mot de passe" htmlFor="pw-next" error={e.next}>
          <PasswordInput id="pw-next" name="next" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirmer" htmlFor="pw-confirm" error={e.confirm}>
          <PasswordInput id="pw-confirm" name="confirm" autoComplete="new-password" minLength={8} required />
        </Field>
        <div className="sm:col-span-3">
          <SubmitButton>Changer le mot de passe</SubmitButton>
        </div>
      </form>
      <FormMessage state={state} className="mt-3" />
    </div>
  );
}

type Member = { id: string; name: string; email: string; role: "owner" | "staff" };

export function TeamManager({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  return (
    <div>
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {m.name} {m.id === currentUserId && <span className="text-muted">(vous)</span>}
              </p>
              <p className="truncate text-xs text-muted">{m.email}</p>
            </div>
            <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{m.role === "owner" ? "Propriétaire" : "Employé"}</Badge>
            {m.role === "staff" ? (
              <ConfirmAction
                action={removeStaff.bind(null, m.id)}
                confirm={`Supprimer le compte de ${m.name} ? Ses ventes restent enregistrées.`}
                label="Supprimer ce compte"
              >
                <Trash2 />
              </ConfirmAction>
            ) : (
              <span className="size-8" />
            )}
          </li>
        ))}
      </ul>
      <Modal
        title="Ajouter un employé"
        description="Il pourra saisir les ventes, les dépenses et le stock, mais ne verra ni les bénéfices ni les rapports."
        trigger={(open) => (
          <Button variant="secondary" className="mt-3" onClick={open}>
            <UserPlus /> Ajouter un employé
          </Button>
        )}
      >
        {(close) => <StaffForm onDone={close} />}
      </Modal>
    </div>
  );
}

function StaffForm({ onDone }: { onDone: () => void }) {
  const [state, action] = useActionState(addStaff, {});
  useOnSuccess(state, onDone);
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nom" htmlFor="staff-name" error={e.name}>
        <Input id="staff-name" name="name" required maxLength={80} autoFocus />
      </Field>
      <Field label="Adresse e-mail" htmlFor="staff-email" error={e.email}>
        <Input id="staff-email" name="email" type="email" required inputMode="email" autoComplete="off" />
      </Field>
      <Field label="Mot de passe provisoire" htmlFor="staff-password" error={e.password} hint="Au moins 8 caractères. Il pourra le changer.">
        <PasswordInput id="staff-password" name="password" minLength={8} required autoComplete="new-password" />
      </Field>
      <FormMessage state={state.ok ? {} : state} />
      <SubmitButton size="lg" className="w-full">
        Créer le compte
      </SubmitButton>
    </form>
  );
}
