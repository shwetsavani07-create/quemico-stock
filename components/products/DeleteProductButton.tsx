"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteProductButton({
                                        productId,
                                    }: {
    productId: string;
}) {
    const router = useRouter();
    const [pending, setPending] = useState(false);

    async function handleDelete() {
        const confirmed = window.confirm(
            "Are you sure you want to delete this product? This will also delete its stock batches and history.",
        );

        if (!confirmed) {
            return;
        }

        setPending(true);

        try {
            const response = await fetch(
                `/api/products/${productId}`,
                {
                    method: "DELETE",
                },
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to delete product.",
                );
            }

            router.push("/products");
            router.refresh();
        } catch (error) {
            console.error("[DeleteProductButton]", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to delete product.",
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-xl border border-danger/20 bg-danger-bg px-4 py-2.5 text-sm font-medium text-danger disabled:opacity-50"
        >
            {pending ? "Deleting..." : "Delete Product"}
        </button>
    );
}