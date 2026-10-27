import { cx } from "./ui";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path
        d="M8.5 21.5 13 16l3.5 3 7-8.5"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="10.5" r="2.2" fill="var(--accent-ink)" />
    </svg>
  );
}

export function Logo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cx("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[0.9375rem] font-bold tracking-tight text-ink">
          YOUBA <span className="font-medium text-ink-2">SERVICE</span>
        </span>
        {subtitle && <span className="truncate text-xs text-muted">{subtitle}</span>}
      </span>
    </span>
  );
}
