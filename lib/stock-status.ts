export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function getStockStatus(
  quantity: number,
  threshold: number,
): StockStatus {
  if (quantity === 0) {
    return "OUT_OF_STOCK";
  }

  if (quantity <= threshold) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case "IN_STOCK":
      return "In Stock";
    case "LOW_STOCK":
      return "Low Stock";
    case "OUT_OF_STOCK":
      return "Out of Stock";
  }
}
