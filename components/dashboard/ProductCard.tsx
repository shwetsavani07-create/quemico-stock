"use client";

import Link from "next/link";
import { useState } from "react";
import { AddStockModal } from "@/components/stock/AddStockModal";
import { SellStockModal } from "@/components/stock/SellStockModal";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import type { ProductWithStock } from "@/types";

export function ProductCard({ product }: { product: ProductWithStock }) {
  const [addOpen, setAddOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  return (
    <>
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="aspect-[4/3] w-full"
        />

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted">Stock</p>
                <p className="font-medium">{product.quantity} pcs</p>
              </div>
              <div>
                <p className="text-muted">Value</p>
                <p className="font-medium">{formatCurrency(product.value)}</p>
              </div>
            </div>
            <StatusBadge status={product.status} />
          </div>

          <div className="mt-auto grid gap-2 sm:grid-cols-2">
            <Button onClick={() => setAddOpen(true)}>+ Add Stock</Button>
            <Button variant="secondary" onClick={() => setSellOpen(true)}>
              Sell Stock
            </Button>
          </div>

          <Link
            href={`/products/${product.id}`}
            className="text-center text-sm font-medium text-brand hover:underline"
          >
            View Details / History
          </Link>
        </div>
      </article>

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
    </>
  );
}
