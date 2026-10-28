"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme-script";
import { cx } from "./ui";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = THEME_KEY;
const EVENT = "youba:theme-change";

function readChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function systemIsDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {}
  if (choice === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", choice);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
    media.removeEventListener("change", callback);
  };
}

/** The saved choice ("system" until the page is hydrated). */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readChoice, () => "system");
}

/** The theme actually shown (null on the server: unknown until hydrated). */
export function useEffectiveTheme(): "light" | "dark" | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      const choice = readChoice();
      return choice === "system" ? (systemIsDark() ? "dark" : "light") : choice;
    },
    () => null,
  );
}

/** One tap switches between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useEffectiveTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Passer en mode sombre" : "Passer en mode clair"}
      title={next === "dark" ? "Mode sombre" : "Mode clair"}
      className={cx(
        "inline-flex size-10 items-center justify-center rounded-full border border-line bg-card text-ink-2 transition-colors hover:bg-subtle hover:text-ink",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

/** Three-way choice for the settings page. */
export function ThemePicker() {
  const choice = useThemeChoice();
  const options: { value: ThemeChoice; label: string }[] = [
    { value: "light", label: "Clair" },
    { value: "dark", label: "Sombre" },
    { value: "system", label: "Automatique" },
  ];
  return (
    <div role="radiogroup" aria-label="Apparence" className="grid grid-cols-3 gap-1 rounded-xl bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={choice === o.value}
          onClick={() => setTheme(o.value)}
          className={cx(
            "h-10 rounded-lg text-sm font-medium transition-colors",
            choice === o.value ? "bg-card text-ink shadow-card" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
