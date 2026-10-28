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

/** "YOUBA SERVICE" → bold first word, lighter rest. Without a name, just the mark. */
export function Logo({ name, className }: { name?: string; className?: string }) {
  const [first, ...rest] = (name ?? "").trim().split(/\s+/);
  return (
    <span className={cx("flex min-w-0 items-center gap-2.5", className)}>
      <LogoMark className="shrink-0" />
      {first && (
        <span className="truncate text-base font-bold tracking-tight text-ink">
          {first} {rest.length > 0 && <span className="font-medium text-ink-2">{rest.join(" ")}</span>}
        </span>
      )}
    </span>
  );
}
