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
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
}) {
  const status = useFormStatus();
  const pending = status.pending || use(PendingContext);
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={className} aria-busy={pending}>
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

/** Calls a bound Server Action after a confirmation prompt (deletes, archives…). */
export function ConfirmAction({
  action,
  confirm,
  children,
  className,
  label,
}: {
  action: () => Promise<void>;
  confirm?: string;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      className={cx(
        "inline-flex items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink disabled:opacity-50 [&_svg]:size-4",
        className ?? "size-8",
      )}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(() => action());
      }}
    >
      {pending ? <Spinner /> : children}
    </button>
  );
}

/** Native <dialog> modal. `children` receives a `close` callback (e.g. after a successful save). */
export function Modal({
  trigger,
  title,
  description,
  children,
}: {
  trigger: (open: () => void) => ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Keep the native dialog in sync with state (showModal gives focus trapping and Esc for free).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <>
      {trigger(open)}
      <dialog
        ref={ref}
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-2xl border border-line bg-card p-0 text-ink shadow-pop"
      >
        {isOpen && (
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {children(close)}
          </div>
        )}
      </dialog>
    </>
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
