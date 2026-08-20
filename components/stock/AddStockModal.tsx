"use client";

import { useActionState, useMemo, useState } from "react";
import { addStockAction, type ActionResult } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export function AddStockModal({
  productId,
  productName,
  open,
  onClose,
}: {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <AddStockModalContent
      key={productId}
      productId={productId}
      productName={productName}
      onClose={onClose}
    />
  );
}

function AddStockModalContent({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [pricePerPiece, setPricePerPiece] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addStockAction.bind(null, productId),
    null,
  );

  const previewValue = useMemo(() => {
    const qty = Number.parseInt(quantity, 10);
    const price = Number.parseFloat(pricePerPiece);

    if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price <= 0) {
      return 0;
    }

    return qty * price;
  }, [quantity, pricePerPiece]);

  if (state?.success) {
    return (
      <Modal open title={`Add Stock — ${productName}`} onClose={onClose}>
        <p className="text-sm text-success">{state.message}</p>
        <Button type="button" onClick={onClose} className="mt-4 w-full">
          Close
        </Button>
      </Modal>
    );
  }

  return (
    <Modal open title={`Add Stock — ${productName}`} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <Input
          label="Quantity"
          name="quantity"
          type="number"
          min="1"
          step="1"
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <Input
          label="Price Per Piece"
          name="pricePerPiece"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={pricePerPiece}
          onChange={(event) => setPricePerPiece(event.target.value)}
        />

        <div className="rounded-xl bg-background px-4 py-3 text-sm">
          <p className="text-muted">
            {quantity || "0"} pcs × {pricePerPiece ? formatCurrency(Number(pricePerPiece)) : "₹0"}
          </p>
          <p className="mt-1 font-semibold text-foreground">
            Stock value: {formatCurrency(previewValue)}
          </p>
        </div>

        {state && !state.success ? (
          <p className="text-sm text-danger">{state.message}</p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Adding..." : "Add Stock"}
        </Button>
      </form>
    </Modal>
  );
}
