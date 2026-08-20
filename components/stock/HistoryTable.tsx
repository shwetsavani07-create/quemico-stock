"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { StockMovementWithProduct } from "@/types";

export function HistoryTable({
  movements,
}: {
  movements: StockMovementWithProduct[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="hidden grid-cols-[1.2fr_1.4fr_1fr_0.8fr_1fr_1fr] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
        <span>Date</span>
        <span>Product</span>
        <span>Action</span>
        <span>Quantity</span>
        <span>Value</span>
        <span>Price</span>
      </div>

      <div className="divide-y divide-border">
        {movements.map((movement) => {
          const isExpanded = expandedId === movement.id;
          const quantityPrefix = movement.type === "ADD" ? "+" : "-";

          return (
            <div key={movement.id} className="px-5 py-4">
              <div className="grid gap-3 md:grid-cols-[1.2fr_1.4fr_1fr_0.8fr_1fr_1fr] md:items-center">
                <div>
                  <p className="text-sm font-medium">{formatDateTime(movement.createdAt)}</p>
                </div>
                <div>
                  <Link
                    href={`/products/${movement.productId}`}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    {movement.productName}
                  </Link>
                </div>
                <div className="text-sm">
                  {movement.type === "ADD" ? "Stock Added" : "Stock Sold"}
                </div>
                <div className="text-sm font-medium">
                  {quantityPrefix}
                  {movement.quantity} pcs
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(movement.value)}
                </div>
                <div className="text-sm text-muted">
                  {movement.type === "ADD" && movement.pricePerPiece
                    ? `${formatCurrency(movement.pricePerPiece)}/piece`
                    : "FIFO"}
                </div>
              </div>

              {movement.type === "SELL" && movement.allocations.length > 0 ? (
                <div className="mt-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-brand hover:underline"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : movement.id)
                    }
                  >
                    {isExpanded ? "Hide FIFO details" : "View FIFO details"}
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 space-y-2 rounded-xl bg-background p-3 text-sm">
                      {movement.allocations.map((allocation) => (
                        <div
                          key={allocation.id}
                          className="flex flex-wrap justify-between gap-2"
                        >
                          <span>
                            {allocation.quantity} pcs @{" "}
                            {formatCurrency(allocation.pricePerPiece)}
                          </span>
                          <span>{formatCurrency(allocation.value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
