"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductImage } from "@/components/ui/ProductImage";

type ProductFormProps = {
    productId?: string;
    initialValues?: {
        name: string;
        lowStockThreshold: number;
        image?: string | null;
    };
    submitLabel: string;
};

export function ProductForm({
                                productId,
                                initialValues,
                                submitLabel,
                            }: ProductFormProps) {
    const router = useRouter();

    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");
        setPending(true);

        try {
            const formData = new FormData(event.currentTarget);

            const url = productId
                ? `/api/products/${productId}`
                : "/api/products";

            const method = productId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Unable to save product. Please try again.",
                );
            }

            router.push(
                productId
                    ? `/products/${productId}`
                    : `/products/${result.productId}`,
            );

            router.refresh();
        } catch (err) {
            console.error("[ProductForm] submit failed:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save product. Please try again.",
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
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
        <span className="text-sm font-medium text-foreground">
          Product Image
        </span>

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
                        <input
                            type="checkbox"
                            name="removeImage"
                            value="true"
                        />
                        Remove current image
                    </label>
                ) : null}
            </div>

            {error ? (
                <p className="text-sm text-danger">
                    {error}
                </p>
            ) : null}

            <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : submitLabel}
            </Button>
        </form>
    );
}