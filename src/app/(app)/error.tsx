"use client";

import { TriangleAlert } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-10 max-w-md p-8 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-bad-soft text-bad">
        <TriangleAlert className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">Oups, quelque chose s&apos;est mal passé</h1>
      <p className="mt-2 text-sm text-ink-2">
        Vérifiez votre connexion internet puis réessayez. Si le problème continue, rechargez la page.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted">Code : {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Réessayer
      </Button>
    </Card>
  );
}
