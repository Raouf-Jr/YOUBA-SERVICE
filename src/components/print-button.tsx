"use client";

import { Printer } from "lucide-react";
import { Button } from "./ui";

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} title="Imprimer ou enregistrer en PDF">
      <Printer /> Imprimer / PDF
    </Button>
  );
}
