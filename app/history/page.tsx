import { HistoryTable } from "@/components/stock/HistoryTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchProductOptions, fetchStockHistory } from "@/lib/queries";
import type { StockMovementWithProduct } from "@/types";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: PageProps<"/history">) {
  const params = await searchParams;
  const productId = typeof params.productId === "string" ? params.productId : "";
  const type =
    params.type === "ADD" || params.type === "SELL" ? params.type : undefined;
  const sort = params.sort === "oldest" ? "oldest" : "newest";

  let movements: StockMovementWithProduct[] | null = null;
  let products: { id: string; name: string }[] | null = null;
  let hasError = false;

  try {
    [movements, products] = await Promise.all([
      fetchStockHistory({ productId: productId || undefined, type, sort }),
      fetchProductOptions(),
    ]);
  } catch {
    hasError = true;
  }

  if (hasError || !movements || !products) {
    return (
      <EmptyState
        title="Unable to load stock history."
        description="Please check your database connection and try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Stock History</h1>
        <p className="mt-1 text-sm text-muted">
          Review stock additions, sales, and FIFO allocations.
        </p>
      </div>

      <form className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Product</span>
          <select
            name="productId"
            defaultValue={productId}
            className="min-h-11 rounded-xl border border-border px-3 py-2"
          >
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Action</span>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="min-h-11 rounded-xl border border-border px-3 py-2"
          >
            <option value="">All actions</option>
            <option value="ADD">Stock Added</option>
            <option value="SELL">Stock Sold</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Sort</span>
          <select
            name="sort"
            defaultValue={sort}
            className="min-h-11 rounded-xl border border-border px-3 py-2"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {movements.length > 0 ? (
        <HistoryTable movements={movements} />
      ) : (
        <EmptyState
          title="No stock movements yet."
          description="Stock history will appear here after you add or sell stock."
        />
      )}
    </div>
  );
}
