export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface FifoBatch {
  id: string;
  remainingQuantity: number;
  pricePerPiece: number;
  createdAt: Date;
}

export interface FifoAllocation {
  batchId: string;
  quantity: number;
  pricePerPiece: number;
  value: number;
}

export interface ProductStockSummary {
  quantity: number;
  value: number;
  status: StockStatus;
}

export interface DashboardSummary {
  totalProducts: number;
  totalStock: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ProductWithStock {
  id: string;
  name: string;
  image: string | null;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
  quantity: number;
  value: number;
  status: StockStatus;
}

export interface StockMovementWithProduct {
  id: string;
  productId: string;
  productName: string;
  type: "ADD" | "SELL";
  quantity: number;
  value: number;
  pricePerPiece: number | null;
  createdAt: Date;
  allocations: {
    id: string;
    quantity: number;
    pricePerPiece: number;
    value: number;
  }[];
}
