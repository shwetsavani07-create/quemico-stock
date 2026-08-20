import { prisma } from "@/lib/prisma";
import {
  getAllProductsWithStock,
  getProductWithStock,
} from "@/lib/fifo";
import { decimalToNumber } from "@/lib/utils";
import type { StockMovementWithProduct } from "@/types";

export async function fetchDashboardData() {
  const [summary, products] = await Promise.all([
    import("@/lib/fifo").then((mod) => mod.getDashboardSummary()),
    getAllProductsWithStock(),
  ]);

  return { summary, products };
}

export async function fetchProducts(search?: string) {
  const products = await getAllProductsWithStock();

  if (!search?.trim()) {
    return products;
  }

  const query = search.trim().toLowerCase();
  return products.filter((product) =>
    product.name.toLowerCase().includes(query),
  );
}

export async function fetchProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return null;
  }

  const [withStock, batches, movements] = await Promise.all([
    getProductWithStock(product),
    prisma.stockBatch.findMany({
      where: { productId: id, remainingQuantity: { gt: 0 } },
      orderBy: { createdAt: "asc" },
    }),
    fetchProductMovements(id),
  ]);

  return {
    product: withStock,
    batches: batches.map((batch) => ({
      id: batch.id,
      quantity: batch.quantity,
      remainingQuantity: batch.remainingQuantity,
      pricePerPiece: decimalToNumber(batch.pricePerPiece),
      createdAt: batch.createdAt,
    })),
    movements,
  };
}

export async function fetchProductMovements(
  productId: string,
): Promise<StockMovementWithProduct[]> {
  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    include: {
      product: { select: { name: true } },
      allocations: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return movements.map((movement) => ({
    id: movement.id,
    productId: movement.productId,
    productName: movement.product.name,
    type: movement.type,
    quantity: movement.quantity,
    value: decimalToNumber(movement.value),
    pricePerPiece: movement.pricePerPiece
      ? decimalToNumber(movement.pricePerPiece)
      : null,
    createdAt: movement.createdAt,
    allocations: movement.allocations.map((allocation) => ({
      id: allocation.id,
      quantity: allocation.quantity,
      pricePerPiece: decimalToNumber(allocation.pricePerPiece),
      value: decimalToNumber(allocation.value),
    })),
  }));
}

export async function fetchStockHistory(options?: {
  productId?: string;
  type?: "ADD" | "SELL";
  sort?: "newest" | "oldest";
}) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(options?.productId ? { productId: options.productId } : {}),
      ...(options?.type ? { type: options.type } : {}),
    },
    include: {
      product: { select: { name: true } },
      allocations: true,
    },
    orderBy: {
      createdAt: options?.sort === "oldest" ? "asc" : "desc",
    },
  });

  return movements.map((movement) => ({
    id: movement.id,
    productId: movement.productId,
    productName: movement.product.name,
    type: movement.type,
    quantity: movement.quantity,
    value: decimalToNumber(movement.value),
    pricePerPiece: movement.pricePerPiece
      ? decimalToNumber(movement.pricePerPiece)
      : null,
    createdAt: movement.createdAt,
    allocations: movement.allocations.map((allocation) => ({
      id: allocation.id,
      quantity: allocation.quantity,
      pricePerPiece: decimalToNumber(allocation.pricePerPiece),
      value: decimalToNumber(allocation.value),
    })),
  })) satisfies StockMovementWithProduct[];
}

export async function fetchLowStockProducts() {
  const products = await getAllProductsWithStock();

  return {
    lowStock: products.filter((product) => product.status === "LOW_STOCK"),
    outOfStock: products.filter((product) => product.status === "OUT_OF_STOCK"),
  };
}

export async function fetchProductOptions() {
  return prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
