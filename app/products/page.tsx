import Link from "next/link";
import { ProductList } from "@/components/products/ProductList";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchProducts } from "@/lib/queries";
import type { ProductWithStock } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";

  let products: ProductWithStock[] | null = null;
  let hasError = false;

  try {
    products = await fetchProducts(search);
  } catch {
    hasError = true;
  }

  if (hasError || !products) {
    return (
      <EmptyState
        title="Unable to load products."
        description="Please check your database connection and try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted">
            Search, add, edit, and manage cosmetic products.
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white"
        >
          Add Product
        </Link>
      </div>

      <form className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Search by product name</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="q"
              defaultValue={search}
              placeholder="Search products..."
              className="min-h-11 flex-1 rounded-xl border border-border px-3 py-2"
            />
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Search
            </button>
          </div>
        </label>
      </form>

      <ProductList products={products} />
    </div>
  );
}
