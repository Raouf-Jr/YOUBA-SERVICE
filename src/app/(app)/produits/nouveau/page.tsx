import type { Metadata } from "next";
import { Suspense } from "react";
import { Bone } from "@/components/skeleton";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { currencySymbol } from "@/lib/format";
import { BackLink } from "../back-link";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nouveau produit" };

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink />
      <PageHeader title="Nouveau produit" description="Seul le nom est obligatoire : le reste peut être complété plus tard." />
      <Card className="p-5 sm:p-6">
        <Suspense fallback={<Bone className="h-96" />}>
          <Form />
        </Suspense>
      </Card>
    </div>
  );
}

async function Form() {
  const user = await requireUser();
  return <ProductForm symbol={currencySymbol(user.shop.currency)} />;
}
