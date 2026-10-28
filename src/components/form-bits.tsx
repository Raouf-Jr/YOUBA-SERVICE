"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { createContext, use, useEffect, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";
import { Button, buttonClass, cx } from "./ui";

const PendingContext = createContext(false);

/**
 * A <form> for useActionState actions that keeps what the user typed when the server
 * answers with an error (React's built-in form actions clear every field afterwards).
 */
export function ActionForm({
  action,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: (formData: FormData) => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext value={pending}>
      <form
        {...props}
        aria-busy={pending || undefined}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const formData = new FormData(event.currentTarget);
          startTransition(() => action(formData));
        }}
      >
        {children}
      </form>
    </PendingContext>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant,
  size,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  disabled?: boolean;
}) {
  const status = useFormStatus();
  const pending = status.pending || use(PendingContext);
  return (
    <Button type="submit" disabled={pending || disabled} variant={variant} size={size} className={className} aria-busy={pending}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? "Enregistrement…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("size-4 animate-spin", className)} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Success / error line under a form. Success messages fade after a few seconds. */
export function FormMessage({ state, className }: { state: FormState; className?: string }) {
  const [expiredStamp, setExpiredStamp] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!state.ok || !state.stamp) return;
    const stamp = state.stamp;
    const t = setTimeout(() => setExpiredStamp(stamp), 4000);
    return () => clearTimeout(t);
  }, [state.ok, state.stamp]);

  const show = state.message && (!state.ok || expiredStamp !== state.stamp);
  return (
    <div aria-live="polite" className={className}>
      {show && (
        <p
          className={cx(
            "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm",
            state.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad",
          )}
        >
          {state.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
          <span>{state.message}</span>
        </p>
      )}
    </div>
  );
}

/** Runs `callback` once per successful submission of a useActionState form. */
export function useOnSuccess(state: FormState, callback: () => void) {
  const last = useRef(state.stamp);
  useEffect(() => {
    if (state.ok && state.stamp && state.stamp !== last.current) {
      last.current = state.stamp;
      callback();
    }
  });
}
