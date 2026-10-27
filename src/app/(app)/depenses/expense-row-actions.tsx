"use client";

import { Pencil, Trash2 } from "lucide-react";
import { ConfirmAction, Modal } from "@/components/form-bits";
import { IconButton } from "@/components/ui";
import { deleteExpense } from "@/lib/actions/expenses";
import { EditExpenseForm, type ExpenseValues } from "./expense-form";

export function ExpenseRowActions({ expense, maxDate, label }: { expense: ExpenseValues; maxDate: string; label: string }) {
  return (
    <div className="flex shrink-0 items-center">
      <Modal
        title="Modifier la dépense"
        trigger={(open) => (
          <IconButton label="Modifier" onClick={open}>
            <Pencil />
          </IconButton>
        )}
      >
        {(close) => <EditExpenseForm expense={expense} maxDate={maxDate} onDone={close} />}
      </Modal>
      <ConfirmAction action={deleteExpense.bind(null, expense.id)} confirm={`Supprimer la dépense « ${label} » ?`} label="Supprimer">
        <Trash2 />
      </ConfirmAction>
    </div>
  );
}
