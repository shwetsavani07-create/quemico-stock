import Link from "next/link";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchLowStockProducts } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";
import type { ProductWithStock } from "@/types";

export const dynamic = "force-dynamic";

export default async function LowStockPage() {
  let lowStock: ProductWithStock[] | null = null;
  let outOfStock: ProductWithStock[] | null = null;
  let hasError = false;

  try {
    const data = await fetchLowStockProducts();
    lowStock = data.lowStock;
    outOfStock = data.outOfStock;
  } catch {
    hasError = true;
  }

  if (hasError || !lowStock || !outOfStock) {
    return (
      <EmptyState
        title="Unable to load low stock alerts."
        description="Please check your database connection and try again."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Low Stock</h1>
        <p className="mt-1 text-sm text-muted">
          Products that need attention based on low-stock thresholds.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Low Stock Alerts</h2>
        {lowStock.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lowStock.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="All products are sufficiently stocked."
            description="No products are currently below their low-stock threshold."
          />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Out of Stock</h2>
        {outOfStock.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="divide-y divide-border">
              {outOfStock.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <Link
                      href={`/products/${product.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {product.quantity} pcs · {formatCurrency(product.value)}
                    </p>
                  </div>
                  <StatusBadge status={product.status} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No out-of-stock products.</p>
        )}
      </section>
    </div>
  );
}
