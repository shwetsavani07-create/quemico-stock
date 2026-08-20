import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailsView } from "@/components/products/ProductDetailsView";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchProductById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProductDetailsPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;

  let data = null;
  let hasError = false;

  try {
    data = await fetchProductById(id);
  } catch {
    hasError = true;
  }

  if (hasError) {
    return (
      <EmptyState
        title="Unable to load product."
        description="Please check your database connection and try again."
      />
    );
  }

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/products" className="text-sm font-medium text-brand hover:underline">
          ← Back to Products
        </Link>
        <Link
          href={`/products/${id}/edit`}
          className="text-sm font-medium text-brand hover:underline"
        >
          Edit Product
        </Link>
      </div>

      <ProductDetailsView
        product={data.product}
        batches={data.batches}
        movements={data.movements}
      />
    </div>
  );
}
