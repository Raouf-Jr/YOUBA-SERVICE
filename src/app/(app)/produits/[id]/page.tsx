import { CircleCheck, NotebookPen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { Meter } from "@/components/stats";
import { Card, CardHeader, cx, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { productHistory } from "@/lib/data/entries";
import { getProduct } from "@/lib/data/products";
import { productTotals } from "@/lib/data/reports";
import { getDb } from "@/lib/db";
import { formatDate, formatDayLong } from "@/lib/dates";
import { currencySymbol, formatMoney, formatPercent } from "@/lib/format";
import { BackLink } from "../back-link";
import { ProductActions } from "../product-actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Produit" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProductPage(props: PageProps<"/produits/[id]">) {
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      <Suspense fallback={<PageSkeleton tiles={2} />}>
        <ProductDetail {...props} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({ params, searchParams }: PageProps<"/produits/[id]">) {
  const user = await requireUser();
  const [{ id }, { nouveau }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const db = await getDb();
  const [product, [totals], history] = await Promise.all([getProduct(db, id), productTotals(db, null, id), productHistory(db, id, 10)]);
  if (!product || !totals) notFound();

  const money = (n: number) => formatMoney(n, user.shop.currency);
  const signed = (n: number) => `${n > 0 ? "+" : ""}${money(n)}`;
  const tone = (n: number) => (n > 0 ? "text-good" : n < 0 ? "text-bad" : "text-ink");
  const ratio = product.investment > 0 ? Math.max(0, totals.profit) / product.investment : null;

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{product.name}</h1>
        {product.archived && <p className="mt-1 text-sm text-warn">Vous ne vendez plus ce produit : il n&apos;apparaît plus dans la saisie.</p>}
      </header>

      {nouveau === "1" && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-good/20 bg-good-soft p-4 text-good sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm">
            <CircleCheck className="mt-0.5 size-4 shrink-0" />
            Produit créé. Vous pouvez maintenant noter ses recettes et dépenses chaque jour.
          </p>
          <LinkButton href="/saisie" className="shrink-0">
            <NotebookPen />
            Aller à la saisie
          </LinkButton>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <p className="text-sm text-ink-2">Bénéfice depuis le début</p>
          <p className={cx("tabular mt-1 text-2xl font-semibold tracking-tight", tone(totals.profit))}>{signed(totals.profit)}</p>
          <dl className="tabular mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="min-w-0">
              <dt className="text-muted">Recettes</dt>
              <dd className="truncate font-medium text-ink">{money(totals.revenue)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted">Dépenses</dt>
              <dd className="truncate font-medium text-ink">{money(totals.expense)}</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-sm text-ink-2">Investissement de départ</p>
          <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">
            {product.investment > 0 ? money(product.investment) : "—"}
          </p>
          {ratio === null ? (
            <p className="mt-3 text-sm text-muted">Indiquez-le ci-dessous pour voir quand il sera remboursé.</p>
          ) : (
            <div className="mt-4">
              <Meter ratio={ratio} color="var(--series-profit)" track="var(--series-profit-soft)" label="Investissement récupéré" />
              <p className="tabular mt-2 text-sm text-ink-2">
                {ratio >= 1 ? "Investissement récupéré ✓" : `${formatPercent(ratio)} récupéré`}
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader title="Réglages du produit" description="Investissement de départ et anciens comptes." />
        <div className="p-5 pt-4">
          <ProductForm product={product} symbol={currencySymbol(user.shop.currency)} />
        </div>
      </Card>

      <Card className="mb-5">
        <CardHeader
          title="Historique"
          description={history.length > 1 ? "Les derniers jours saisis. Touchez un jour pour le corriger." : undefined}
          action={
            totals.days > history.length && (
              <Link
                href={`/rapports?periode=tout&produit=${product.id}`}
                className="text-sm font-medium text-accent-text underline-offset-4 hover:underline"
              >
                Tout voir
              </Link>
            )
          }
        />
        {history.length === 0 && !totals.opening ? (
          <p className="px-5 pt-2 pb-5 text-sm text-ink-2">
            Rien de saisi pour l&apos;instant.{" "}
            <Link href="/saisie" className="font-medium text-accent-text underline-offset-4 hover:underline">
              Saisir la journée
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {history.map((day) => {
              const result = day.revenue - day.expense;
              return (
                <li key={day.date}>
                  <Link href={`/saisie?date=${day.date}`} className="block px-5 py-3 transition-colors hover:bg-subtle/60">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium text-ink">{formatDayLong(day.date)}</span>
                      <span className={cx("tabular shrink-0 text-sm font-semibold", tone(result))}>{signed(result)}</span>
                    </div>
                    <p className="tabular mt-0.5 text-xs text-muted">
                      Recette {money(day.revenue)} · Dépense {money(day.expense)}
                      {day.note && ` · ${day.note}`}
                    </p>
                  </Link>
                </li>
              );
            })}
            {totals.opening && (
              <li className="bg-subtle/50 px-5 py-3">
                <p className="text-sm font-medium text-ink">Comptes repris au {formatDate(totals.opening.date)}</p>
                <p className="tabular mt-0.5 text-xs text-muted">
                  Recettes {money(totals.opening.revenue)} · Dépenses {money(totals.opening.expense)}
                </p>
              </li>
            )}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-[0.9375rem] font-semibold text-ink">Arrêter ou supprimer</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted">
          Si vous ne vendez plus ce produit, il disparaît de la saisie mais ses chiffres restent dans les rapports.
        </p>
        <ProductActions id={product.id} name={product.name} archived={product.archived} />
      </Card>
    </>
  );
}
