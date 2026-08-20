import { connectDB } from "@/lib/mongodb";
import {
  Product,
  StockBatch,
  StockMovement,
  toProductRecord,
} from "@/lib/models";
import {
  getAllProductsWithStock,
  getProductWithStock,
} from "@/lib/fifo";
import type { StockMovementWithProduct } from "@/types";

function mapMovement(
  movement: {
    _id: { toString(): string };
    productId: { toString(): string } | string;
    type: "ADD" | "SELL";
    quantity: number;
    value: number;
    pricePerPiece?: number | null;
    createdAt: Date;
    allocations?: Array<{
      _id?: { toString(): string };
      batchId: { toString(): string } | string;
      quantity: number;
      pricePerPiece: number;
      value: number;
    }>;
  },
  productName: string,
): StockMovementWithProduct {
  return {
    id: movement._id.toString(),
    productId:
      typeof movement.productId === "string"
        ? movement.productId
        : movement.productId.toString(),
    productName,
    type: movement.type,
    quantity: movement.quantity,
    value: movement.value,
    pricePerPiece: movement.pricePerPiece ?? null,
    createdAt: movement.createdAt,
    allocations: (movement.allocations ?? []).map((allocation, index) => ({
      id: allocation._id?.toString() ?? `${movement._id.toString()}-${index}`,
      quantity: allocation.quantity,
      pricePerPiece: allocation.pricePerPiece,
      value: allocation.value,
    })),
  };
}

export async function fetchDashboardData() {
  try {
    const [summary, products] = await Promise.all([
      import("@/lib/fifo").then((mod) => mod.getDashboardSummary()),
      getAllProductsWithStock(),
    ]);

    return { summary, products };
  } catch (error) {
    console.error("[queries] fetchDashboardData failed:", error);
    throw error;
  }
}

export async function fetchProducts(search?: string) {
  try {
    const products = await getAllProductsWithStock();

    if (!search?.trim()) {
      return products;
    }

    const query = search.trim().toLowerCase();
    return products.filter((product) =>
      product.name.toLowerCase().includes(query),
    );
  } catch (error) {
    console.error("[queries] fetchProducts failed:", error);
    throw error;
  }
}

export async function fetchProductById(id: string) {
  try {
    await connectDB();

    const product = await Product.findById(id);

    if (!product) {
      return null;
    }

    const productRecord = toProductRecord(product);

    const [withStock, batches, movements] = await Promise.all([
      getProductWithStock(productRecord),
      StockBatch.find({ productId: id, remainingQuantity: { $gt: 0 } })
        .sort({ createdAt: 1 })
        .lean(),
      fetchProductMovements(id),
    ]);

    return {
      product: withStock,
      batches: batches.map((batch) => ({
        id: batch._id.toString(),
        quantity: batch.quantity,
        remainingQuantity: batch.remainingQuantity,
        pricePerPiece: batch.pricePerPiece,
        createdAt: batch.createdAt,
      })),
      movements,
    };
  } catch (error) {
    console.error("[queries] fetchProductById failed:", error);
    throw error;
  }
}

export async function fetchProductMovements(
  productId: string,
): Promise<StockMovementWithProduct[]> {
  await connectDB();

  const product = await Product.findById(productId).select("name");
  const movements = await StockMovement.find({ productId }).sort({
    createdAt: -1,
  });

  return movements.map((movement) =>
    mapMovement(movement, product?.name ?? "Unknown"),
  );
}

export async function fetchStockHistory(options?: {
  productId?: string;
  type?: "ADD" | "SELL";
  sort?: "newest" | "oldest";
}) {
  await connectDB();

  const filter: Record<string, unknown> = {};

  if (options?.productId) {
    filter.productId = options.productId;
  }

  if (options?.type) {
    filter.type = options.type;
  }

  const movements = await StockMovement.find(filter).sort({
    createdAt: options?.sort === "oldest" ? 1 : -1,
  });

  const productIds = [...new Set(movements.map((m) => m.productId.toString()))];
  const products = await Product.find({ _id: { $in: productIds } }).select(
    "name",
  );
  const productMap = new Map(
    products.map((product) => [product._id.toString(), product.name]),
  );

  return movements.map((movement) =>
    mapMovement(
      movement,
      productMap.get(movement.productId.toString()) ?? "Unknown",
    ),
  ) satisfies StockMovementWithProduct[];
}

export async function fetchLowStockProducts() {
  try {
    const products = await getAllProductsWithStock();

    return {
      lowStock: products.filter((product) => product.status === "LOW_STOCK"),
      outOfStock: products.filter(
        (product) => product.status === "OUT_OF_STOCK",
      ),
    };
  } catch (error) {
    console.error("[queries] fetchLowStockProducts failed:", error);
    throw error;
  }
}

export async function fetchProductOptions() {
  await connectDB();

  const products = await Product.find().select("name").sort({ name: 1 });

  return products.map((product) => ({
    id: product._id.toString(),
    name: product.name,
  }));
}
