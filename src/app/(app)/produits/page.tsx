import { ChevronRight, Package, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { Meter } from "@/components/stats";
import { Card, cx, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { productTotals, type ProductTotals } from "@/lib/data/reports";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Produits" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Mes produits"
        description="Touchez un produit pour indiquer son investissement de départ ou reprendre vos anciens comptes."
        actions={
          <LinkButton href="/produits/nouveau" size="lg" className="w-full sm:w-auto">
            <Plus />
            Ajouter un produit
          </LinkButton>
        }
      />
      <Suspense fallback={<PageSkeleton header={false} tiles={0} />}>
        <Products />
      </Suspense>
    </>
  );
}

async function Products() {
  const user = await requireUser();
  const all = await productTotals(await getDb(), null);
  const money = (n: number) => formatMoney(n, user.shop.currency);
  const active = all.filter((p) => !p.archived);
  const archived = all.filter((p) => p.archived);

  if (all.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Package className="size-5" />} title="Aucun produit pour l'instant">
          Ajoutez ce que vous vendez : par exemple « Boissons », « Riz » ou « Crédit téléphone ».
        </EmptyState>
      </Card>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {active.map((p) => (
          <ProductCard key={p.productId} product={p} money={money} />
        ))}
      </ul>
      {archived.length > 0 && (
        <details className="group mt-8">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
            Produits que je ne vends plus ({archived.length})
          </summary>
          <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {archived.map((p) => (
              <ProductCard key={p.productId} product={p} money={money} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function ProductCard({ product: p, money }: { product: ProductTotals; money: (n: number) => string }) {
  const ratio = p.investment > 0 ? Math.max(0, p.profit) / p.investment : null;
  return (
    <li>
      <Link
        href={`/produits/${p.productId}`}
        className={cx(
          "group flex h-full flex-col rounded-2xl border border-line bg-card p-4 shadow-card transition-colors hover:border-line-strong sm:p-5",
          p.archived && "opacity-75",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-semibold text-ink">{p.name}</h2>
          <ChevronRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </div>
        <dl className="tabular mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0">
            <dt className="text-muted">Investi au départ</dt>
            <dd className="truncate font-medium text-ink">{p.investment > 0 ? money(p.investment) : "—"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">Bénéfice total</dt>
            <dd className={cx("truncate font-medium", p.profit > 0 ? "text-good" : p.profit < 0 ? "text-bad" : "text-ink")}>
              {p.profit > 0 ? "+" : ""}
              {money(p.profit)}
            </dd>
          </div>
        </dl>
        {ratio !== null && (
          <div className="mt-3">
            <Meter ratio={ratio} color="var(--series-profit)" track="var(--series-profit-soft)" label="Investissement récupéré" />
            <p className="tabular mt-1.5 text-xs text-ink-2">
              {ratio >= 1 ? "Investissement récupéré ✓" : `${formatPercent(ratio)} de l'investissement récupéré`}
            </p>
          </div>
        )}
        <p className="mt-auto pt-3 text-xs text-muted">
          {p.lastDate ? `Dernière saisie : ${formatDate(p.lastDate)}` : p.opening ? `Comptes repris au ${formatDate(p.opening.date)}` : "Rien de saisi pour l'instant"}
        </p>
      </Link>
    </li>
  );
}
