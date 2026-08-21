import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { DeleteProductButton } from "@/components/products/DeleteProductButton";
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

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        Edit Product
                    </h1>

                    <p className="mt-1 text-sm text-muted">
                        {data.product.name}
                    </p>
                </div>

                <Link
                    href={`/products/${id}`}
                    className="text-sm font-medium text-brand hover:underline"
                >
                    Cancel
                </Link>
            </div>

            <ProductForm
                productId={id}
                initialValues={{
                    name: data.product.name,
                    lowStockThreshold: data.product.lowStockThreshold,
                    image: data.product.image,
                }}
                submitLabel="Save Changes"
            />

            <DeleteProductButton productId={id} />
        </div>
    );
}