import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  Product,
  StockBatch,
  StockMovement,
  toProductRecord,
} from "@/lib/models";
import {
  calculateStockFromBatches,
  consumeFifoBatches,
  StockError,
} from "@/lib/fifo-core";
import { getStockStatus } from "@/lib/stock-status";
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

function toFifoBatch(batch: {
  _id: mongoose.Types.ObjectId;
  remainingQuantity: number;
  pricePerPiece: number;
  createdAt: Date;
}): FifoBatch {
  return {
    id: batch._id.toString(),
    remainingQuantity: batch.remainingQuantity,
    pricePerPiece: batch.pricePerPiece,
    createdAt: batch.createdAt,
  };
}

export async function getRemainingBatches(
  productId: string,
): Promise<FifoBatch[]> {
  await connectDB();

  const batches = await StockBatch.find({
    productId,
    remainingQuantity: { $gt: 0 },
  })
    .sort({ createdAt: 1 })
    .lean();

  return batches.map((batch) =>
    toFifoBatch({
      _id: batch._id,
      remainingQuantity: batch.remainingQuantity,
      pricePerPiece: batch.pricePerPiece,
      createdAt: batch.createdAt,
    }),
  );
}

export async function getCurrentStock(
  productId: string,
): Promise<ProductStockSummary> {
  await connectDB();

  const product = await Product.findById(productId).select("lowStockThreshold");

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

  await connectDB();

  const product = await Product.findById(productId).select("_id");

  if (!product) {
    throw new StockError("Product not found.");
  }

  const totalValue = quantity * pricePerPiece;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await StockBatch.create(
      [
        {
          productId,
          quantity,
          remainingQuantity: quantity,
          pricePerPiece,
        },
      ],
      { session },
    );

    const [movement] = await StockMovement.create(
      [
        {
          productId,
          type: "ADD",
          quantity,
          value: totalValue,
          pricePerPiece,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return movement;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function sellStock(productId: string, quantityToSell: number) {
  if (quantityToSell <= 0) {
    throw new StockError("Please enter a valid quantity.");
  }

  await connectDB();

  const product = await Product.findById(productId).select("_id");

  if (!product) {
    throw new StockError("Product not found.");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const batches = await StockBatch.find({
      productId,
      remainingQuantity: { $gt: 0 },
    })
      .sort({ createdAt: 1 })
      .session(session);

    const fifoBatches = batches.map(toFifoBatch);
    const { allocations, totalValue } = consumeFifoBatches(
      fifoBatches,
      quantityToSell,
    );

    for (const allocation of allocations) {
      await StockBatch.findByIdAndUpdate(
        allocation.batchId,
        { $inc: { remainingQuantity: -allocation.quantity } },
        { session },
      );
    }

    const [movement] = await StockMovement.create(
      [
        {
          productId,
          type: "SELL",
          quantity: quantityToSell,
          value: totalValue,
          allocations: allocations.map((allocation) => ({
            batchId: allocation.batchId,
            quantity: allocation.quantity,
            pricePerPiece: allocation.pricePerPiece,
            value: allocation.value,
          })),
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return movement;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function getProductWithStock(product: {
  id: string;
  name: string;
  image: string | null;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}): Promise<ProductWithStock> {
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
  await connectDB();

  const products = await Product.find().sort({ name: 1 });

  return Promise.all(
    products.map((product) => getProductWithStock(toProductRecord(product))),
  );
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  await connectDB();

  const products = await getAllProductsWithStock();

  const soldMovements = await StockMovement.find({
    type: "SELL",
  }).select("value");

  const totalSellingStockValue = soldMovements.reduce(
      (sum, movement) => sum + movement.value,
      0,
  );

  return {
    totalProducts: products.length,
    totalStock: products.reduce((sum, product) => sum + product.quantity, 0),
    totalStockValue: products.reduce(
        (sum, product) => sum + product.value,
        0,
    ),
    totalSellingStockValue,
    lowStockCount: products.filter(
        (product) => product.status === "LOW_STOCK",
    ).length,
    outOfStockCount: products.filter(
        (product) => product.status === "OUT_OF_STOCK",
    ).length,
  };
}
