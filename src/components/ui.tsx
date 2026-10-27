import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Layout

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-sm font-medium text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-[0.9375rem] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  className,
  children,
  ...props
}: ComponentProps<"section"> & { children: ReactNode }) {
  return (
    <section
      className={cx("print-plain rounded-2xl border border-line bg-card shadow-card", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="no-print shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center px-6 py-10 text-center", className)}>
      {icon && (
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-subtle text-ink-2">{icon}</div>
      )}
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buttons

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover shadow-sm",
  secondary: "bg-card text-ink border border-line-strong hover:bg-subtle",
  ghost: "text-ink-2 hover:bg-subtle hover:text-ink",
  danger: "bg-bad text-white hover:opacity-90",
  soft: "bg-accent-soft text-accent-text hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-[0.9375rem] gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cx(
    "inline-flex select-none items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function IconButton({ className, label, ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Form controls

export const inputClass =
  "block w-full rounded-xl border border-line-strong bg-card px-3.5 h-11 text-[0.9375rem] text-ink placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 aria-invalid:border-bad aria-invalid:ring-bad/10 disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-bad">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cx(inputClass, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m5.5 8 4.5 4.5L14.5 8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputClass, "h-auto min-h-20 py-2.5", className)} {...props} />;
}

export function Checkbox({ label, description, ...props }: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 transition-colors hover:bg-subtle has-checked:border-accent/40 has-checked:bg-accent-soft/50">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" {...props} />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Small display bits

type Tone = "neutral" | "accent" | "good" | "bad" | "warn" | "revenue" | "expenses";

const tones: Record<Tone, string> = {
  neutral: "bg-subtle text-ink-2",
  accent: "bg-accent-soft text-accent-text",
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  revenue: "bg-revenue-soft/70 text-ink",
  expenses: "bg-expenses-soft/70 text-ink",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cx("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ background: color }} />;
}
