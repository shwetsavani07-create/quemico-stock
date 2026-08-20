import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true },
);

ProductSchema.index({ name: 1 });

const StockBatchSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  remainingQuantity: { type: Number, required: true, min: 0 },
  pricePerPiece: { type: Number, required: true, min: 0.01 },
  createdAt: { type: Date, default: Date.now },
});

StockBatchSchema.index({ productId: 1, createdAt: 1 });

const StockMovementAllocationSchema = new Schema({
  batchId: {
    type: Schema.Types.ObjectId,
    ref: "StockBatch",
    required: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  pricePerPiece: { type: Number, required: true, min: 0.01 },
  value: { type: Number, required: true, min: 0 },
});

const StockMovementSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  type: { type: String, enum: ["ADD", "SELL"], required: true },
  quantity: { type: Number, required: true, min: 1 },
  value: { type: Number, required: true, min: 0 },
  pricePerPiece: { type: Number, default: null },
  allocations: { type: [StockMovementAllocationSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ createdAt: -1 });
StockMovementSchema.index({ type: 1 });

export type IProduct = InferSchemaType<typeof ProductSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type IStockBatch = InferSchemaType<typeof StockBatchSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type IStockMovement = InferSchemaType<typeof StockMovementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Product: Model<IProduct> =
  mongoose.models.Product ?? mongoose.model<IProduct>("Product", ProductSchema);

export const StockBatch: Model<IStockBatch> =
  mongoose.models.StockBatch ??
  mongoose.model<IStockBatch>("StockBatch", StockBatchSchema);

export const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement ??
  mongoose.model<IStockMovement>("StockMovement", StockMovementSchema);

export function toProductRecord(doc: IProduct) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    image: doc.image ?? null,
    lowStockThreshold: doc.lowStockThreshold,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toBatchRecord(doc: IStockBatch) {
  return {
    id: doc._id.toString(),
    productId: doc.productId.toString(),
    quantity: doc.quantity,
    remainingQuantity: doc.remainingQuantity,
    pricePerPiece: doc.pricePerPiece,
    createdAt: doc.createdAt,
  };
}
