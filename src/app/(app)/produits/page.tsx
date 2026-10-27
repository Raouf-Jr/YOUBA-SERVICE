import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { StatTile } from "@/components/stats";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listCategories, listProducts } from "@/lib/data/products";
import { getDb } from "@/lib/db";
import { today } from "@/lib/dates";
import { formatMoney, formatNumber } from "@/lib/format";
import { ProductsView } from "./products-view";

export const metadata: Metadata = { title: "Produits & stock" };

export default function ProductsPage({ searchParams }: PageProps<"/produits">) {
  return (
    <Suspense fallback={<PageSkeleton tiles={3} />}>
      <Products searchParams={searchParams} />
    </Suspense>
  );
}

async function Products({ searchParams }: { searchParams: PageProps<"/produits">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const db = await getDb();
  const [products, categories] = await Promise.all([
    listProducts(db, user.shop.id, { includeArchived: true }),
    listCategories(db, user.shop.id),
  ]);

  const active = products.filter((p) => !p.archived);
  const tracked = active.filter((p) => p.trackStock);
  const stockValue = tracked.reduce((s, p) => s + Math.max(0, p.stock) * (p.costPrice ?? p.salePrice), 0);
  const alerts = tracked.filter((p) => p.stock <= (p.lowStockThreshold ?? 0)).length;
  const isOwner = user.role === "owner";

  return (
    <>
      <PageHeader title="Produits & stock" description="Votre catalogue, vos prix et ce qu'il reste en boutique." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile label="Produits en vente" value={formatNumber(active.length)} footer={<span className="text-xs text-muted">{tracked.length} suivis en stock</span>} />
        <StatTile
          label="Alertes de stock"
          value={formatNumber(alerts)}
          footer={<span className={`text-xs ${alerts ? "text-warn" : "text-muted"}`}>{alerts ? "À réapprovisionner" : "Tout va bien"}</span>}
        />
        {isOwner && (
          <StatTile
            className="col-span-2 lg:col-span-1"
            label="Valeur du stock"
            value={formatMoney(stockValue, user.shop.currency)}
            footer={<span className="text-xs text-muted">Au prix d&apos;achat</span>}
          />
        )}
      </div>
      <Card className="overflow-hidden">
        <ProductsView
          // Employees never receive purchase prices (and therefore margins).
          products={isOwner ? products : products.map((p) => ({ ...p, costPrice: null }))}
          categories={categories}
          currency={user.shop.currency}
          todayISO={today(user.shop.timezone)}
          isOwner={isOwner}
          initialFilter={params.filtre === "alerte" ? "alerte" : "tous"}
        />
      </Card>
    </>
  );
}
