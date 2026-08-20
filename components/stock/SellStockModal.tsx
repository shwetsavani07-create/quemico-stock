"use client";

import { useActionState, useState } from "react";
import { sellStockAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export function SellStockModal({
  productId,
  productName,
  currentStock,
  open,
  onClose,
}: {
  productId: string;
  productName: string;
  currentStock: number;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <SellStockModalContent
      key={`${productId}-${currentStock}`}
      productId={productId}
      productName={productName}
      currentStock={currentStock}
      onClose={onClose}
    />
  );
}

function SellStockModalContent({
  productId,
  productName,
  currentStock,
  onClose,
}: {
  productId: string;
  productName: string;
  currentStock: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    sellStockAction.bind(null, productId),
    null,
  );
  const [quantity, setQuantity] = useState("");

  if (state?.success) {
    return (
      <Modal open title={`Sell Stock — ${productName}`} onClose={onClose}>
        <p className="text-sm text-success">{state.message}</p>
        <Button type="button" onClick={onClose} className="mt-4 w-full">
          Close
        </Button>
      </Modal>
    );
  }

  return (
    <Modal open title={`Sell Stock — ${productName}`} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <div className="rounded-xl bg-background px-4 py-3 text-sm">
          <p className="text-muted">Current Stock</p>
          <p className="font-semibold text-foreground">{currentStock} pcs</p>
        </div>

        <Input
          label="Quantity to Sell"
          name="quantity"
          type="number"
          min="1"
          max={currentStock}
          step="1"
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />

        <p className="text-sm text-muted">
          FIFO valuation will be applied automatically.
        </p>

        {state && !state.success ? (
          <p className="text-sm text-danger">{state.message}</p>
        ) : null}

        <Button
          type="submit"
          disabled={pending || currentStock === 0}
          className="w-full"
        >
          {pending ? "Selling..." : "Sell Stock"}
        </Button>
      </form>
    </Modal>
  );
}
