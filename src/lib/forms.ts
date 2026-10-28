import { z } from "zod";
import { parseAmount } from "./amount";
import { isISODate } from "./dates";

export { parseAmount };

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Changes on every successful submit so forms can reset themselves. */
  stamp?: number;
};

const amount = (label: string, { optional = false, allowZero = false } = {}) =>
  z
    .any()
    // Keeps the key optional in objects: unchecked sections simply don't post these inputs.
    .optional()
    .transform((v) => parseAmount(v))
    .superRefine((v, ctx) => {
      if (v == null) {
        if (!optional) ctx.addIssue({ code: "custom", message: `${label} est obligatoire` });
        return;
      }
      if (Number.isNaN(v)) ctx.addIssue({ code: "custom", message: `${label} doit être un nombre` });
      else if (v < 0 || (!allowZero && v === 0)) ctx.addIssue({ code: "custom", message: `${label} doit être positif` });
      else if (v > 1e11) ctx.addIssue({ code: "custom", message: `${label} est trop grand` });
    });

export const fields = {
  amount,
  text: (label: string, max = 120) =>
    z
      .string({ error: `${label} est obligatoire` })
      .trim()
      .min(1, `${label} est obligatoire`)
      .max(max, `${label} est trop long`),
  optionalText: (max = 300) =>
    z
      .string()
      .trim()
      .max(max, "Texte trop long")
      .optional()
      .transform((v) => (v ? v : null)),
  date: z.string().refine(isISODate, "Date invalide"),
  checkbox: z
    .any()
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
};

/** Runs a zod schema on form data and returns either the data or field errors. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData) {
  const raw = Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")));
  const result = schema.safeParse(raw);
  if (result.success) return { data: result.data as z.output<T>, errors: null };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { data: null, errors };
}

export const invalid = (errors: Record<string, string>): FormState => ({
  ok: false,
  errors,
  message: "Vérifiez les champs en rouge.",
});

export const success = (message: string): FormState => ({ ok: true, message, stamp: Date.now() });
