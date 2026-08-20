"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductImage } from "@/components/ui/ProductImage";

type ProductFormProps = {
  action: (
    prevState: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  initialValues?: {
    name: string;
    lowStockThreshold: number;
    image?: string | null;
  };
  submitLabel: string;
};

export function ProductForm({
  action,
  initialValues,
  submitLabel,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm"
    >
      <Input
        label="Product Name"
        name="name"
        required
        defaultValue={initialValues?.name ?? ""}
      />

      <Input
        label="Low Stock Threshold"
        name="lowStockThreshold"
        type="number"
        min="0"
        step="1"
        required
        defaultValue={initialValues?.lowStockThreshold ?? 10}
      />

      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">Product Image</span>
        {initialValues?.image ? (
          <ProductImage
            src={initialValues.image}
            alt={initialValues.name}
            className="h-40 w-full max-w-xs"
          />
        ) : null}
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
        />
        {initialValues?.image ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="removeImage" value="true" />
            Remove current image
          </label>
        ) : null}
      </div>

      {state && !state.success ? (
        <p className="text-sm text-danger">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
