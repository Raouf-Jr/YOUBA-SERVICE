import { Package, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Calculation, profitLine, type CalcLine } from "@/components/calculation";
import { PageSkeleton } from "@/components/skeleton";
import { Card, CardHeader, cx, EmptyState, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listGeneralExpenses } from "@/lib/data/general-expenses";
import { shopBalance } from "@/lib/data/reports";
import { getDb } from "@/lib/db";
import { formatDate, today } from "@/lib/dates";
import { currencySymbol, formatMoney } from "@/lib/format";
import { DeleteGeneralExpense, GeneralExpenseForm } from "./general-expenses";

export const metadata: Metadata = { title: "Bilan" };

export default function BalancePage() {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <Balance />
    </Suspense>
  );
}

async function Balance() {
  const user = await requireUser();
  const { currency } = user.shop;
  const db = await getDb();
  const [balance, spent] = await Promise.all([shopBalance(db), listGeneralExpenses(db)]);
  const money = (n: number) => formatMoney(n, currency);
  const signed = (n: number) => `${n > 0 ? "+" : ""}${money(n)}`;
  const tone = (n: number) => (n > 0 ? "text-good" : n < 0 ? "text-bad" : "text-ink");

  const header = (
    <header className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">Bilan de la boutique</h1>
      <p className="mt-1 text-[0.9375rem] text-ink-2">Tout l&apos;argent de la boutique, tous les produits réunis, depuis le début.</p>
    </header>
  );

  if (balance.products.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<Package className="size-5" />}
            title="Aucun produit pour l'instant"
            action={
              <LinkButton href="/produits/nouveau" size="lg">
                <Plus />
                Ajouter un produit
              </LinkButton>
            }
          >
            Le bilan se remplit dès que vous avez ajouté vos produits et noté vos premières journées.
          </EmptyState>
        </Card>
      </>
    );
  }

  const lines: CalcLine[] = [
    { sign: "", label: "Investissement de départ", hint: "L'argent mis au départ dans tous les produits", amount: balance.invested },
    ...(balance.profitBefore
      ? [profitLine("Bénéfice d'avant l'application", "Perte d'avant l'application", balance.profitBefore, "Sommes arrêtées à la main, avant de commencer ici")]
      : []),
    profitLine("Bénéfice des produits", "Perte des produits", balance.profitSince, "Recettes moins dépenses, notées chaque jour"),
    { sign: "−", label: "Dépenses sur le bénéfice", hint: "Loyer, électricité, argent pour la maison… (voir plus bas)", amount: balance.generalExpenses },
    { sign: "=", label: "Capital actuel", amount: balance.capital },
  ];
  const productsCapital = balance.products.reduce((s, p) => s + p.capital, 0);
  const productsProfit = balance.products.reduce((s, p) => s + p.totalProfit, 0);

  return (
    <>
      {header}

      <Card className="mb-5 p-5 sm:p-6">
        <p className="text-sm font-medium text-ink-2">Capital actuel de la boutique</p>
        <p className={cx("tabular mt-1 text-3xl font-bold tracking-tight sm:text-4xl", balance.capital < 0 ? "text-bad" : "text-ink")}>
          {money(balance.capital)}
        </p>
        <p className="mt-1 mb-4 text-sm text-muted">Le calcul :</p>
        <Calculation lines={lines} currency={currency} />
      </Card>

      <Card className="mb-5">
        <CardHeader title="Capital par produit" description="Pour chaque produit : investissement de départ + bénéfice." />
        <div className="mt-3 border-t border-line">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] gap-4 px-5 py-2.5 text-xs font-medium text-muted md:grid">
            <span>Produit</span>
            <span className="text-right">Investissement</span>
            <span className="text-right">Bénéfice</span>
            <span className="text-right">Capital</span>
          </div>
          <ul className="divide-y divide-line md:border-t md:border-line">
            {balance.products.map((p) => (
              <li key={p.productId}>
                <Link
                  href={`/produits/${p.productId}`}
                  className="tabular block px-5 py-3 transition-colors hover:bg-subtle/60 md:grid md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] md:items-baseline md:gap-4"
                >
                  <div className="flex items-baseline justify-between gap-3 md:block">
                    <span className="min-w-0 truncate font-medium text-ink">
                      {p.name}
                      {p.archived && <span className="font-normal text-muted"> (plus vendu)</span>}
                    </span>
                    <span className="shrink-0 font-semibold text-ink md:hidden">{money(p.capital)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-2 md:hidden">
                    {money(p.investment)} investis + <span className={tone(p.totalProfit)}>{money(p.totalProfit)}</span> de bénéfice
                  </p>
                  <span className="hidden text-right text-sm text-ink md:block">{money(p.investment)}</span>
                  <span className={cx("hidden text-right text-sm md:block", tone(p.totalProfit))}>{signed(p.totalProfit)}</span>
                  <span className="hidden text-right text-sm font-semibold text-ink md:block">{money(p.capital)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div
            className={cx(
              "tabular flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line bg-subtle/60 px-5 py-3.5 md:grid md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] md:gap-4",
              balance.generalExpenses > 0 ? "border-b" : "rounded-b-2xl",
            )}
          >
            <span className="font-semibold text-ink">Total des produits</span>
            <span className="font-semibold text-ink md:hidden">{money(productsCapital)}</span>
            <span className="hidden text-right text-sm font-semibold text-ink md:block">{money(balance.invested)}</span>
            <span className={cx("hidden text-right text-sm font-semibold md:block", tone(productsProfit))}>{signed(productsProfit)}</span>
            <span className="hidden text-right text-sm font-semibold text-ink md:block">{money(productsCapital)}</span>
          </div>
        </div>
        {balance.generalExpenses > 0 && (
          <p className="tabular px-5 py-3.5 text-sm text-ink-2">
            {money(productsCapital)} − {money(balance.generalExpenses)} de dépenses sur le bénéfice ={" "}
            <strong className="text-ink">{money(balance.capital)}</strong>, le capital actuel.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Dépenses sur le bénéfice"
          description="L'argent pris sur le bénéfice de toute la boutique, qui ne concerne pas un seul produit : loyer, électricité, argent pour la maison…"
        />
        <div className="p-5 pt-4">
          <GeneralExpenseForm today={today(user.shop.timezone)} symbol={currencySymbol(currency)} />
        </div>
        {spent.length > 0 && (
          <>
            <ul className="divide-y divide-line border-t border-line">
              {spent.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{g.label}</p>
                    <p className="text-xs text-muted">{formatDate(g.date)}</p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-semibold text-ink">{money(g.amount)}</span>
                  <DeleteGeneralExpense id={g.id} label={g.label} />
                </li>
              ))}
            </ul>
            <div className="tabular flex items-baseline justify-between gap-3 rounded-b-2xl border-t border-line bg-subtle/60 px-5 py-3.5">
              <span className="font-semibold text-ink">Total des dépenses sur le bénéfice</span>
              <span className="shrink-0 font-semibold text-ink">{money(balance.generalExpenses)}</span>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
