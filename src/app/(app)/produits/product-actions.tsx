"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { Spinner } from "@/components/form-bits";
import { Button } from "@/components/ui";
import { archiveProduct, deleteProduct } from "@/lib/actions/products";

export function ProductActions({ id, name, archived }: { id: string; name: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button variant="secondary" disabled={pending} onClick={() => start(() => archiveProduct(id, !archived))}>
        {pending ? <Spinner /> : archived ? <RotateCcw /> : <Archive />}
        {archived ? "Remettre dans la saisie" : "Je ne vends plus ce produit"}
      </Button>
      <Button
        variant="ghost"
        disabled={pending}
        className="text-bad hover:bg-bad-soft hover:text-bad"
        onClick={() => {
          if (window.confirm(`Supprimer « ${name} » et tous ses chiffres ? C'est définitif.`)) start(() => deleteProduct(id));
        }}
      >
        <Trash2 />
        Supprimer
      </Button>
    </div>
  );
}
