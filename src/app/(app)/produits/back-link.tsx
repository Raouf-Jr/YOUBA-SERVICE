import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink() {
  return (
    <Link href="/produits" className="mb-3 inline-flex h-9 items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
      <ArrowLeft className="size-4" />
      Produits
    </Link>
  );
}
