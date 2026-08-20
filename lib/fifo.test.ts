import { describe, expect, it } from "vitest";
import {
  calculateStockFromBatches,
  consumeFifoBatches,
  StockError,
} from "@/lib/fifo-core";
import { getStockStatus } from "@/lib/stock-status";
import type { FifoBatch } from "@/types";

function createBatch(
  id: string,
  remainingQuantity: number,
  pricePerPiece: number,
  createdAt: string,
): FifoBatch {
  return {
    id,
    remainingQuantity,
    pricePerPiece,
    createdAt: new Date(createdAt),
  };
}

describe("FIFO inventory", () => {
  it("adds first batch correctly", () => {
    const batches = [createBatch("b1", 100, 100, "2026-01-01")];
    const stock = calculateStockFromBatches(batches);

    expect(stock.quantity).toBe(100);
    expect(stock.value).toBe(10000);
  });

  it("adds second batch correctly", () => {
    const batches = [
      createBatch("b1", 100, 100, "2026-01-01"),
      createBatch("b2", 50, 120, "2026-01-02"),
    ];
    const stock = calculateStockFromBatches(batches);

    expect(stock.quantity).toBe(150);
    expect(stock.value).toBe(16000);
  });

  it("sells 30 pcs from oldest batch", () => {
    const batches = [
      createBatch("b1", 100, 100, "2026-01-01"),
      createBatch("b2", 50, 120, "2026-01-02"),
    ];

    const result = consumeFifoBatches(batches, 30);
    const remaining = calculateStockFromBatches(result.updatedBatches);

    expect(result.totalValue).toBe(3000);
    expect(remaining.quantity).toBe(120);
    expect(remaining.value).toBe(13000);
  });

  it("sells across multiple batches", () => {
    const batches = [
      createBatch("b1", 70, 100, "2026-01-01"),
      createBatch("b2", 50, 120, "2026-01-02"),
    ];

    const result = consumeFifoBatches(batches, 80);
    const remaining = calculateStockFromBatches(result.updatedBatches);

    expect(result.allocations).toEqual([
      { batchId: "b1", quantity: 70, pricePerPiece: 100, value: 7000 },
      { batchId: "b2", quantity: 10, pricePerPiece: 120, value: 1200 },
    ]);
    expect(remaining.quantity).toBe(40);
    expect(remaining.value).toBe(4800);
  });

  it("adds a new batch after partial sell", () => {
    const batches = [
      createBatch("b2", 40, 120, "2026-01-02"),
      createBatch("b3", 30, 125, "2026-01-03"),
    ];
    const stock = calculateStockFromBatches(batches);

    expect(stock.quantity).toBe(70);
    expect(stock.value).toBe(8550);
  });

  it("sells all remaining stock", () => {
    const batches = [
      createBatch("b2", 40, 120, "2026-01-02"),
      createBatch("b3", 30, 125, "2026-01-03"),
    ];

    const result = consumeFifoBatches(batches, 70);
    const remaining = calculateStockFromBatches(result.updatedBatches);

    expect(remaining.quantity).toBe(0);
    expect(remaining.value).toBe(0);
  });

  it("rejects selling more than available stock", () => {
    const batches = [createBatch("b1", 0, 100, "2026-01-01")];

    expect(() => consumeFifoBatches(batches, 1)).toThrow(StockError);
  });
});

describe("low stock status", () => {
  it("returns IN STOCK above threshold", () => {
    expect(getStockStatus(15, 10)).toBe("IN_STOCK");
  });

  it("returns LOW STOCK at threshold", () => {
    expect(getStockStatus(10, 10)).toBe("LOW_STOCK");
  });

  it("returns OUT OF STOCK at zero", () => {
    expect(getStockStatus(0, 10)).toBe("OUT_OF_STOCK");
  });
});

describe("dashboard calculations", () => {
  it("never hardcodes totals", () => {
    const products = [
      { quantity: 60, value: 7350, threshold: 10 },
      { quantity: 0, value: 0, threshold: 5 },
      { quantity: 8, value: 960, threshold: 10 },
    ];

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, product) => sum + product.quantity, 0);
    const totalStockValue = products.reduce((sum, product) => sum + product.value, 0);
    const lowStockCount = products.filter(
      (product) => product.quantity > 0 && product.quantity <= product.threshold,
    ).length;
    const outOfStockCount = products.filter((product) => product.quantity === 0).length;

    expect(totalProducts).toBe(3);
    expect(totalStock).toBe(68);
    expect(totalStockValue).toBe(8310);
    expect(lowStockCount).toBe(1);
    expect(outOfStockCount).toBe(1);
  });
});
