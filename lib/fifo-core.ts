import type {
  FifoAllocation,
  FifoBatch,
  ProductStockSummary,
} from "@/types";

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

export function calculateStockFromBatches(
  batches: FifoBatch[],
): ProductStockSummary {
  const activeBatches = batches.filter((batch) => batch.remainingQuantity > 0);
  const quantity = activeBatches.reduce(
    (sum, batch) => sum + batch.remainingQuantity,
    0,
  );
  const value = activeBatches.reduce(
    (sum, batch) => sum + batch.remainingQuantity * batch.pricePerPiece,
    0,
  );

  return {
    quantity,
    value,
    status: "OUT_OF_STOCK",
  };
}

export function consumeFifoBatches(
  batches: FifoBatch[],
  quantityToSell: number,
): {
  allocations: FifoAllocation[];
  updatedBatches: FifoBatch[];
  totalValue: number;
} {
  if (quantityToSell <= 0) {
    throw new StockError("Please enter a valid quantity.");
  }

  const sortedBatches = [...batches]
    .filter((batch) => batch.remainingQuantity > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const availableQuantity = sortedBatches.reduce(
    (sum, batch) => sum + batch.remainingQuantity,
    0,
  );

  if (quantityToSell > availableQuantity) {
    throw new StockError("Not enough stock available.");
  }

  let remainingToSell = quantityToSell;
  const allocations: FifoAllocation[] = [];
  const updatedBatches = sortedBatches.map((batch) => ({ ...batch }));

  for (const batch of updatedBatches) {
    if (remainingToSell <= 0) {
      break;
    }

    const consumed = Math.min(batch.remainingQuantity, remainingToSell);
    const value = consumed * batch.pricePerPiece;

    allocations.push({
      batchId: batch.id,
      quantity: consumed,
      pricePerPiece: batch.pricePerPiece,
      value,
    });

    batch.remainingQuantity -= consumed;
    remainingToSell -= consumed;
  }

  const totalValue = allocations.reduce(
    (sum, allocation) => sum + allocation.value,
    0,
  );

  return {
    allocations,
    updatedBatches,
    totalValue,
  };
}
