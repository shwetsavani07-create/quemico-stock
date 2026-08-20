import type { StockStatus } from "@/lib/stock-status";
import { getStockStatusLabel } from "@/lib/stock-status";
import { cn } from "@/lib/utils";

const styles: Record<StockStatus, string> = {
  IN_STOCK: "bg-success-bg text-success border border-success/20",
  LOW_STOCK: "bg-warning-bg text-warning border border-warning/20",
  OUT_OF_STOCK: "bg-danger-bg text-danger border border-danger/20",
};

export function StatusBadge({
  status,
  className,
}: {
  status: StockStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        styles[status],
        className,
      )}
    >
      {getStockStatusLabel(status)}
    </span>
  );
}
