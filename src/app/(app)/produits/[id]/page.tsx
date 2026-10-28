import { CircleCheck, NotebookPen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Calculation, profitLine, type CalcLine } from "@/components/calculation";
import { PageSkeleton } from "@/components/skeleton";
import { Card, CardHeader, cx, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { productHistory } from "@/lib/data/entries";
import { getProduct } from "@/lib/data/products";
import { productTotals } from "@/lib/data/reports";
import { getDb } from "@/lib/db";
import { formatDate, formatDayLong } from "@/lib/dates";
import { currencySymbol, formatMoney } from "@/lib/format";
import { BackLink } from "../back-link";
import { ProductActions } from "../product-actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Produit" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProductPage(props: PageProps<"/produits/[id]">) {
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      <Suspense fallback={<PageSkeleton tiles={0} />}>
        <ProductDetail {...props} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({ params, searchParams }: PageProps<"/produits/[id]">) {
  const user = await requireUser();
  const { currency } = user.shop;
  const [{ id }, { nouveau }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const db = await getDb();
  const [product, [totals], history] = await Promise.all([getProduct(db, id), productTotals(db, null, id), productHistory(db, id, 10)]);
  if (!product || !totals) notFound();

  const money = (n: number) => formatMoney(n, currency);
  const signed = (n: number) => `${n > 0 ? "+" : ""}${money(n)}`;
  const tone = (n: number) => (n > 0 ? "text-good" : n < 0 ? "text-bad" : "text-ink");
  const before = totals.opening?.profit ?? 0;
  const lines: CalcLine[] = [
    { sign: "", label: "Investissement de départ", amount: product.investment },
    ...(totals.opening
      ? [profitLine("Bénéfice d'avant l'application", "Perte d'avant l'application", before, `Calculé le ${formatDate(totals.opening.date)}`)]
      : []),
    profitLine(
      "Bénéfice noté ici",
      "Perte notée ici",
      totals.profit,
      `Recettes ${money(totals.revenue)} − Dépenses ${money(totals.expense)}`,
    ),
    { sign: "=", label: "Capital du produit", amount: product.investment + before + totals.profit },
  ];

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
            Produit ajouté. Vous pouvez maintenant noter ses recettes et dépenses chaque jour dans Saisie.
          </p>
          <LinkButton href="/saisie" className="shrink-0">
            <NotebookPen />
            Aller à la saisie
          </LinkButton>
        </div>
      )}

      <Card className="mb-5 p-5 sm:p-6">
        <h2 className="mb-3 text-[0.9375rem] font-semibold text-ink">Depuis le début</h2>
        <Calculation lines={lines} currency={currency} />
      </Card>

      <Card className="mb-5">
        <CardHeader title="Modifier le produit" />
        <div className="p-5 pt-4">
          <ProductForm product={product} symbol={currencySymbol(currency)} />
        </div>
      </Card>

      <Card className="mb-5">
        <CardHeader
          title="Dernières journées"
          description={history.length > 0 ? "Touchez une journée pour la corriger." : undefined}
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
        {history.length === 0 ? (
          <p className="px-5 pt-2 pb-5 text-sm text-ink-2">
            Aucune journée notée pour l&apos;instant.{" "}
            <Link href="/saisie" className="font-medium text-accent-text underline-offset-4 hover:underline">
              Aller à la saisie
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {history.map((day) => {
              const profit = day.revenue - day.expense;
              return (
                <li key={day.date}>
                  <Link href={`/saisie?date=${day.date}`} className="tabular block px-5 py-3 transition-colors hover:bg-subtle/60">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium text-ink">{formatDayLong(day.date)}</span>
                      <span className={cx("shrink-0 text-sm font-semibold", tone(profit))}>{signed(profit)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Recette {money(day.revenue)} − Dépense {money(day.expense)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-[0.9375rem] font-semibold text-ink">Arrêter ou supprimer</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted">
          Si vous ne vendez plus ce produit, il disparaît de la saisie mais ses chiffres restent dans le bilan et les rapports.
        </p>
        <ProductActions id={product.id} name={product.name} archived={product.archived} />
      </Card>
    </>
  );
}
