"use client";

import { useState } from "react";
import { AddStockModal } from "@/components/stock/AddStockModal";
import { SellStockModal } from "@/components/stock/SellStockModal";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { HistoryTable } from "@/components/stock/HistoryTable";
import { formatCurrency } from "@/lib/utils";
import { getStockStatusLabel } from "@/lib/stock-status";
import type { ProductWithStock, StockMovementWithProduct } from "@/types";

export function ProductDetailsView({
  product,
  batches,
  movements,
}: {
  product: ProductWithStock;
  batches: {
    id: string;
    quantity: number;
    remainingQuantity: number;
    pricePerPiece: number;
    createdAt: Date;
  }[];
  movements: StockMovementWithProduct[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [showBatches, setShowBatches] = useState(false);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-2xl border border-border bg-white p-6 shadow-sm lg:grid-cols-[240px_1fr]">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="aspect-square w-full max-w-xs"
          priority
        />

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{product.name}</h1>
            <div className="mt-3">
              <StatusBadge status={product.status} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Current Stock" value={`${product.quantity} pcs`} />
            <Metric
              label="Current Stock Value"
              value={formatCurrency(product.value)}
            />
            <Metric
              label="Low Stock Threshold"
              value={`${product.lowStockThreshold} pcs`}
            />
            <Metric label="Status" value={getStockStatusLabel(product.status)} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setAddOpen(true)}>+ Add Stock</Button>
            <Button variant="secondary" onClick={() => setSellOpen(true)}>
              Sell Stock
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Active FIFO Batches</h2>
          <button
            type="button"
            className="text-sm font-medium text-brand hover:underline"
            onClick={() => setShowBatches((value) => !value)}
          >
            {showBatches ? "Hide batches" : "Show batches"}
          </button>
        </div>

        {showBatches ? (
          batches.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="divide-y divide-border">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
                  >
                    <span>
                      {batch.remainingQuantity} / {batch.quantity} pcs remaining
                    </span>
                    <span>{formatCurrency(batch.pricePerPiece)}/piece</span>
                    <span className="text-muted">
                      {formatCurrency(batch.remainingQuantity * batch.pricePerPiece)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">No active batches.</p>
          )
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Stock History</h2>
        {movements.length > 0 ? (
          <HistoryTable movements={movements} />
        ) : (
          <p className="text-sm text-muted">No stock movements yet.</p>
        )}
      </section>

      <AddStockModal
        productId={product.id}
        productName={product.name}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <SellStockModal
        productId={product.id}
        productName={product.name}
        currentStock={product.quantity}
        open={sellOpen}
        onClose={() => setSellOpen(false)}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
