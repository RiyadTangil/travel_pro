"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Invoice } from "@/types/invoice";

interface InvoiceActionsProps {
  invoice: Invoice;
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onMoneyReceipt?: (invoice: Invoice) => void;
  /** Narrow screens: single menu instead of many sticky buttons */
  compact?: boolean;
}

export function InvoiceActions({
  status,
  invoice,
  onView,
  onEdit,
  onDelete,
  onMoneyReceipt,
  compact = false,
}: InvoiceActionsProps & { status: string }) {
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Invoice actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {invoice.invoiceType === "visa" && (
            <DropdownMenuItem onSelect={() => (invoice as any).onAssignBy?.(invoice)}>
              Assign By
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => onView?.(invoice)}>View</DropdownMenuItem>
          {status === "due" && (
            <DropdownMenuItem onSelect={() => onEdit?.(invoice)}>Edit</DropdownMenuItem>
          )}
          {status === "due" && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete?.(invoice)}
            >
              Delete
            </DropdownMenuItem>
          )}
          {status !== "paid" && (
            <DropdownMenuItem onSelect={() => onMoneyReceipt?.(invoice)}>Money Receipt</DropdownMenuItem>
          )}
          {invoice.invoiceType === "non_commission" && (
            <DropdownMenuItem disabled>Partial Cost</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-nowrap">
      {invoice.invoiceType === "visa" && (
        <Button
          variant="outline"
          onClick={() => (invoice as any).onAssignBy?.(invoice)}
          className="h-7 px-2 text-[10px] bg-cyan-500 hover:bg-cyan-600 text-white border-none"
        >
          Assign By
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={() => onView?.(invoice)}
        className="h-7 px-2 text-[10px] bg-sky-500 hover:bg-sky-600 text-white"
      >
        View
      </Button>
      {status === "due" && (
        <Button
          variant="outline"
          onClick={() => onEdit?.(invoice)}
          className="h-7 px-2 text-[10px] bg-blue-500 hover:bg-blue-600 text-white border-none"
        >
          Edit
        </Button>
      )}
      {status === "due" && (
        <Button
          variant="destructive"
          onClick={() => onDelete?.(invoice)}
          className="h-7 px-2 text-[10px]"
        >
          Delete
        </Button>
      )}
      {status !== "paid" && (
        <Button
          variant="outline"
          onClick={() => onMoneyReceipt?.(invoice)}
          className="h-7 px-2 text-[10px] bg-cyan-500 hover:bg-cyan-600 text-white border-none"
        >
          Money Receipt
        </Button>
      )}
      {invoice.invoiceType === "non_commission" && (
        <Button
          variant="outline"
          className="h-7 px-2 text-[10px] bg-sky-400 hover:bg-sky-500 text-white border-none"
        >
          Partial Cost
        </Button>
      )}
    </div>
  );
}
