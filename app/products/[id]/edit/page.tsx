import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { updateProductAction, deleteProductAction } from "@/lib/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchProductById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: PageProps<"/products/[id]/edit">) {
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

  const deleteWithId = deleteProductAction.bind(null, id);
  const updateWithId = updateProductAction.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Product</h1>
          <p className="mt-1 text-sm text-muted">{data.product.name}</p>
        </div>
        <Link
          href={`/products/${id}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          Cancel
        </Link>
      </div>

      <ProductForm
        action={updateWithId}
        initialValues={{
          name: data.product.name,
          lowStockThreshold: data.product.lowStockThreshold,
          image: data.product.image,
        }}
        submitLabel="Save Changes"
      />

      <form action={deleteWithId}>
        <button
          type="submit"
          className="rounded-xl border border-danger/20 bg-danger-bg px-4 py-2.5 text-sm font-medium text-danger"
        >
          Delete Product
        </button>
      </form>
    </div>
  );
}
