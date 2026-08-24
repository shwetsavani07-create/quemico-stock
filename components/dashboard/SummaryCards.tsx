import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

const cards = [
  { key: "totalProducts", label: "Total Products", suffix: "" },
  { key: "totalStock", label: "Total Stock", suffix: " pcs" },
  {
    key: "totalStockValue",
    label: "Current Stock Value",
    suffix: "",
    currency: true,
  },
  {
    key: "totalSellingStockValue",
    label: "Total Selling Stock Value",
    suffix: "",
    currency: true,
  },
  { key: "lowStockCount", label: "Low Stock", suffix: "" },
  { key: "outOfStockCount", label: "Out of Stock", suffix: "" },
] as const;

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => {
        const value = summary[card.key];

        return (
          <div
            key={card.key}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {"currency" in card && card.currency
                ? formatCurrency(value)
                : `${value.toLocaleString("en-IN")}${card.suffix}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
