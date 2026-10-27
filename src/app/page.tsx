import {
  ChartColumn,
  Package,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { LinkButton } from "@/components/ui";

const FEATURES = [
  {
    Icon: ShoppingCart,
    title: "Ventes du jour en 30 secondes",
    text: "Choisissez vos produits, tapez les quantités : le chiffre d'affaires se calcule tout seul.",
  },
  {
    Icon: Receipt,
    title: "Dépenses bien rangées",
    text: "Loyer, transport, marchandises… chaque dépense dans sa catégorie, mois par mois.",
  },
  {
    Icon: Package,
    title: "Stock et alertes",
    text: "Le stock baisse à chaque vente. Vous êtes prévenu avant la rupture.",
  },
  {
    Icon: PiggyBank,
    title: "Investissement et rentabilité",
    text: "Voyez combien de votre investissement est déjà remboursé, et quand il le sera.",
  },
  {
    Icon: ChartColumn,
    title: "Courbes et rapports",
    text: "Évolution jour, semaine, mois. Meilleurs produits. Export Excel et impression PDF.",
  },
  {
    Icon: Smartphone,
    title: "Fait pour le téléphone",
    text: "S'installe comme une application. Rapide, même avec une petite connexion.",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-gradient-to-b from-accent-soft to-transparent" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <LinkButton href="/connexion" variant="ghost" size="sm">
            Se connecter
          </LinkButton>
          <LinkButton href="/inscription" size="sm" className="hidden sm:inline-flex">
            Créer ma boutique
          </LinkButton>
        </nav>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid items-center gap-12 pt-10 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" /> Gratuit · Sans installation
            </p>
            <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl">
              Votre boutique,
              <br />
              <span className="text-accent-text">enfin claire.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-2">
              Notez vos ventes et vos dépenses chaque jour. YOUBA SERVICE calcule votre bénéfice, suit votre stock et
              vous montre l&apos;évolution de votre activité en courbes simples.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/inscription" size="lg">
                Créer ma boutique gratuitement
              </LinkButton>
              <LinkButton href="/connexion" variant="secondary" size="lg">
                J&apos;ai déjà un compte
              </LinkButton>
            </div>
          </div>
          <Preview />
        </section>

        <section className="pb-20">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">Tout ce qu&apos;il faut, rien de compliqué</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-line bg-card p-5 shadow-card">
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-2">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line py-8 text-center text-sm text-muted">
        YOUBA SERVICE — gestion simple pour petites boutiques ·{" "}
        <Link href="/connexion" className="underline-offset-4 hover:underline">
          Connexion
        </Link>
      </footer>
    </div>
  );
}

/** A static, illustrative glimpse of the dashboard (decorative). */
function Preview() {
  return (
    <div aria-hidden className="relative rounded-3xl border border-line bg-card p-4 shadow-pop sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Bénéfice · 30 jours</p>
          <p className="text-3xl font-semibold tracking-tight">412 500 F CFA</p>
        </div>
        <span className="rounded-full bg-good-soft px-2.5 py-1 text-xs font-medium text-good">▲ 18 %</span>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          ["Ventes", "1,2 M", "var(--series-revenue)"],
          ["Dépenses", "787 k", "var(--series-expenses)"],
          ["Articles", "634", "var(--muted)"],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-xl bg-subtle p-3">
            <p className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
              <span className="size-2 rounded-full" style={{ background: color }} />
              {label}
            </p>
            <p className="mt-1 font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 320 120" className="h-auto w-full">
        {[20, 50, 80, 110].map((y) => (
          <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="var(--grid)" strokeWidth="1" />
        ))}
        <path
          d="M0 92 L27 84 L53 88 L80 70 L107 74 L133 58 L160 64 L187 46 L213 52 L240 38 L267 42 L293 26 L320 30 L320 110 L0 110Z"
          fill="var(--series-revenue)"
          opacity="0.1"
        />
        <path
          d="M0 92 L27 84 L53 88 L80 70 L107 74 L133 58 L160 64 L187 46 L213 52 L240 38 L267 42 L293 26 L320 30"
          fill="none"
          stroke="var(--series-revenue)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M0 100 L27 96 L53 98 L80 92 L107 95 L133 88 L160 90 L187 84 L213 86 L240 80 L267 83 L293 76 L320 78"
          fill="none"
          stroke="var(--series-expenses)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
