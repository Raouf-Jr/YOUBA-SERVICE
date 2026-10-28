import { Package, Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { entriesForDay } from "@/lib/data/entries";
import { listProducts } from "@/lib/data/products";
import { productTotals } from "@/lib/data/reports";
import { getDb } from "@/lib/db";
import { isISODate, today } from "@/lib/dates";
import { DayEntry } from "./day-entry";

export const metadata: Metadata = { title: "Saisie du jour" };

export default function EntryPage({ searchParams }: PageProps<"/saisie">) {
  return (
    <Suspense fallback={<PageSkeleton tiles={0} />}>
      <Entry searchParams={searchParams} />
    </Suspense>
  );
}

async function Entry({ searchParams }: Pick<PageProps<"/saisie">, "searchParams">) {
  const user = await requireUser();
  const { date: requested } = await searchParams;
  const todayISO = today(user.shop.timezone);
  const asked = typeof requested === "string" && isISODate(requested) && requested <= todayISO ? requested : null;
  const date = asked ?? todayISO;

  const db = await getDb();
  const [products, saved, totals] = await Promise.all([listProducts(db), entriesForDay(db, date), productTotals(db, null)]);

  if (products.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Package className="size-5" />}
          title="Commencez par ajouter vos produits"
          action={
            <LinkButton href="/produits/nouveau" size="lg">
              <Plus />
              Ajouter un produit
            </LinkButton>
          }
        >
          Ensuite, chaque jour, vous noterez ici ce que chaque produit a rapporté et ce qu&apos;il a coûté.
        </EmptyState>
      </Card>
    );
  }

  const totalsById = new Map(totals.map((t) => [t.productId, t]));
  return (
    <DayEntry
      userId={user.id}
      date={date}
      followToday={!asked}
      timezone={user.shop.timezone}
      currency={user.shop.currency}
      saved={saved}
      products={products.map((p) => {
        const t = totalsById.get(p.id);
        return { id: p.id, name: p.name, investment: p.investment, profitSoFar: t?.profit ?? 0 };
      })}
    />
  );
}
