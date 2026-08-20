import { ProductForm } from "@/components/products/ProductForm";
import { createProductAction } from "@/lib/actions";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add Product</h1>
        <p className="mt-1 text-sm text-muted">
          Create a cosmetic product with image and low-stock threshold.
        </p>
      </div>

      <ProductForm action={createProductAction} submitLabel="Add Product" />
    </div>
  );
}
