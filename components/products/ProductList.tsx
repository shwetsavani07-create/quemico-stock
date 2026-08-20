import Link from "next/link";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ProductWithStock } from "@/types";

export function ProductGrid({ products }: { products: ProductWithStock[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products yet"
        description="Add your first cosmetic product to start managing stock."
        actionLabel="Add Product"
        actionHref="/products/new"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function ProductList({ products }: { products: ProductWithStock[] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found."
        description="Try a different search term or add a new product."
        actionLabel="Add Product"
        actionHref="/products/new"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="divide-y divide-border">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-background"
          >
            <div>
              <p className="font-medium text-foreground">{product.name}</p>
              <p className="text-sm text-muted">
                {product.quantity} pcs · Threshold {product.lowStockThreshold}
              </p>
            </div>
            <span className="text-sm font-medium text-brand">View</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
