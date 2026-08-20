import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateStockFromBatches,
  consumeFifoBatches,
  StockError,
} from "@/lib/fifo-core";
import { getStockStatus } from "@/lib/stock-status";
import { decimalToNumber } from "@/lib/utils";
import type {
  DashboardSummary,
  FifoBatch,
  ProductStockSummary,
  ProductWithStock,
} from "@/types";

export { StockError } from "@/lib/fifo-core";
export {
  calculateStockFromBatches,
  consumeFifoBatches,
} from "@/lib/fifo-core";

export function toFifoBatch(batch: {
  id: string;
  remainingQuantity: number;
  pricePerPiece: Prisma.Decimal;
  createdAt: Date;
}): FifoBatch {
  return {
    id: batch.id,
    remainingQuantity: batch.remainingQuantity,
    pricePerPiece: decimalToNumber(batch.pricePerPiece),
    createdAt: batch.createdAt,
  };
}

export async function getRemainingBatches(
  productId: string,
): Promise<FifoBatch[]> {
  const batches = await prisma.stockBatch.findMany({
    where: {
      productId,
      remainingQuantity: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
  });

  return batches.map(toFifoBatch);
}

export async function getCurrentStock(
  productId: string,
): Promise<ProductStockSummary> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { lowStockThreshold: true },
  });

  if (!product) {
    throw new StockError("Product not found.");
  }

  const batches = await getRemainingBatches(productId);
  const { quantity, value } = calculateStockFromBatches(batches);

  return {
    quantity,
    value,
    status: getStockStatus(quantity, product.lowStockThreshold),
  };
}

export async function getCurrentStockValue(productId: string): Promise<number> {
  const stock = await getCurrentStock(productId);
  return stock.value;
}

export async function addStock(
  productId: string,
  quantity: number,
  pricePerPiece: number,
) {
  if (quantity <= 0) {
    throw new StockError("Please enter a valid quantity.");
  }

  if (pricePerPiece <= 0) {
    throw new StockError("Please enter a valid price.");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    throw new StockError("Product not found.");
  }

  const totalValue = quantity * pricePerPiece;

  return prisma.$transaction(async (tx) => {
    await tx.stockBatch.create({
      data: {
        productId,
        quantity,
        remainingQuantity: quantity,
        pricePerPiece,
      },
    });

    return tx.stockMovement.create({
      data: {
        productId,
        type: "ADD",
        quantity,
        value: totalValue,
        pricePerPiece,
      },
    });
  });
}

export async function sellStock(productId: string, quantityToSell: number) {
  if (quantityToSell <= 0) {
    throw new StockError("Please enter a valid quantity.");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    throw new StockError("Product not found.");
  }

  return prisma.$transaction(async (tx) => {
    const batches = await tx.stockBatch.findMany({
      where: {
        productId,
        remainingQuantity: { gt: 0 },
      },
      orderBy: { createdAt: "asc" },
    });

    const fifoBatches = batches.map(toFifoBatch);
    const { allocations, totalValue } = consumeFifoBatches(
      fifoBatches,
      quantityToSell,
    );

    for (const allocation of allocations) {
      await tx.stockBatch.update({
        where: { id: allocation.batchId },
        data: {
          remainingQuantity: {
            decrement: allocation.quantity,
          },
        },
      });
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        type: "SELL",
        quantity: quantityToSell,
        value: totalValue,
      },
    });

    if (allocations.length > 0) {
      await tx.stockMovementAllocation.createMany({
        data: allocations.map((allocation) => ({
          movementId: movement.id,
          batchId: allocation.batchId,
          quantity: allocation.quantity,
          pricePerPiece: allocation.pricePerPiece,
          value: allocation.value,
        })),
      });
    }

    return movement;
  });
}

export async function getProductWithStock(
  product: {
    id: string;
    name: string;
    image: string | null;
    lowStockThreshold: number;
    createdAt: Date;
    updatedAt: Date;
  },
): Promise<ProductWithStock> {
  const batches = await getRemainingBatches(product.id);
  const { quantity, value } = calculateStockFromBatches(batches);

  return {
    ...product,
    quantity,
    value,
    status: getStockStatus(quantity, product.lowStockThreshold),
  };
}

export async function getAllProductsWithStock(): Promise<ProductWithStock[]> {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  return Promise.all(products.map((product) => getProductWithStock(product)));
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const products = await getAllProductsWithStock();

  return {
    totalProducts: products.length,
    totalStock: products.reduce((sum, product) => sum + product.quantity, 0),
    totalStockValue: products.reduce((sum, product) => sum + product.value, 0),
    lowStockCount: products.filter((product) => product.status === "LOW_STOCK")
      .length,
    outOfStockCount: products.filter(
      (product) => product.status === "OUT_OF_STOCK",
    ).length,
  };
}
