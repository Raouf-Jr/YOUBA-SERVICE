import { Package, Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { entriesForDay } from "@/lib/data/entries";
import { listProducts } from "@/lib/data/products";
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
  const [products, saved] = await Promise.all([listProducts(db), entriesForDay(db, date)]);

  if (products.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Package className="size-5" />}
          title="Bienvenue ! Commencez par ajouter vos produits"
          action={
            <LinkButton href="/produits/nouveau" size="lg">
              <Plus />
              Ajouter un produit
            </LinkButton>
          }
        >
          Ensuite, chaque jour, vous noterez ici pour chaque produit l&apos;argent qui est rentré et l&apos;argent qui est
          sorti.
        </EmptyState>
      </Card>
    );
  }

  return (
    <DayEntry
      userId={user.id}
      date={date}
      followToday={!asked}
      timezone={user.shop.timezone}
      currency={user.shop.currency}
      saved={saved}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
