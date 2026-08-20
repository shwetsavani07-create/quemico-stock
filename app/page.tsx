import Link from "next/link";
import { ProductGrid } from "@/components/products/ProductList";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchDashboardData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let summary;
  let products;
  let hasError = false;

  try {
    const data = await fetchDashboardData();
    summary = data.summary;
    products = data.products;
  } catch (error) {
    hasError = true;
    console.error(
      "[dashboard] Failed to load products:",
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
  }

  if (hasError || !summary || !products) {
    return (
      <EmptyState
        title="Unable to load products."
        description="Please check your database connection and try again."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Manage cosmetics inventory, stock value, and alerts.
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
        >
          Add Product
        </Link>
      </div>

      <SummaryCards summary={summary} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Products</h2>
        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Add your first cosmetic product to start managing stock."
            actionLabel="Add Product"
            actionHref="/products/new"
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </div>
  );
}
