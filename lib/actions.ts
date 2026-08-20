"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { addStock, sellStock, StockError } from "@/lib/fifo";
import {
  parseNonNegativeInteger,
  parsePositiveInteger,
  parsePositivePrice,
} from "@/lib/utils";

export type ActionResult = {
  success: boolean;
  message: string;
};

function revalidateInventoryPaths(productId?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/history");
  revalidatePath("/low-stock");

  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

function normalizeName(name: string): string {
  return name.trim();
}

export async function createProductAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = normalizeName(String(formData.get("name") ?? ""));

  if (!name) {
    return { success: false, message: "Name required." };
  }

  const threshold = parseNonNegativeInteger(
    String(formData.get("lowStockThreshold") ?? ""),
  );

  if (threshold === null) {
    return {
      success: false,
      message: "Low-stock threshold must be >= 0.",
    };
  }

  const imageFile = formData.get("image");

  try {
    let imagePath: string | undefined;

    if (imageFile instanceof File && imageFile.size > 0) {
      imagePath = await saveProductImage(imageFile);
    }

    const product = await prisma.product.create({
      data: {
        name,
        lowStockThreshold: threshold,
        image: imagePath,
      },
    });

    revalidateInventoryPaths(product.id);
    redirect(`/products/${product.id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      success: false,
      message: "Unable to create product. Please try again.",
    };
  }
}

export async function updateProductAction(
  productId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = normalizeName(String(formData.get("name") ?? ""));

  if (!name) {
    return { success: false, message: "Name required." };
  }

  const threshold = parseNonNegativeInteger(
    String(formData.get("lowStockThreshold") ?? ""),
  );

  if (threshold === null) {
    return {
      success: false,
      message: "Low-stock threshold must be >= 0.",
    };
  }

  const imageFile = formData.get("image");
  const removeImage = formData.get("removeImage") === "true";

  try {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      return { success: false, message: "Product not found." };
    }

    let image = existing.image;

    if (removeImage) {
      image = null;
    }

    if (imageFile instanceof File && imageFile.size > 0) {
      image = await saveProductImage(imageFile);
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        lowStockThreshold: threshold,
        image,
      },
    });

    revalidateInventoryPaths(productId);
    redirect(`/products/${productId}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      success: false,
      message: "Unable to update product. Please try again.",
    };
  }
}

export async function deleteProductAction(
  productId: string,
  _formData: FormData,
): Promise<void> {
  try {
    await prisma.product.delete({ where: { id: productId } });
    revalidateInventoryPaths();
    redirect("/products");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    throw new Error("Unable to delete product. Please try again.");
  }
}

export async function addStockAction(
  productId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const quantity = parsePositiveInteger(String(formData.get("quantity") ?? ""));
  const pricePerPiece = parsePositivePrice(
    String(formData.get("pricePerPiece") ?? ""),
  );

  if (quantity === null) {
    return { success: false, message: "Please enter a valid quantity." };
  }

  if (pricePerPiece === null) {
    return {
      success: false,
      message: "Price must be greater than 0.",
    };
  }

  try {
    await addStock(productId, quantity, pricePerPiece);
    revalidateInventoryPaths(productId);
    return { success: true, message: "Stock added successfully." };
  } catch (error) {
    if (error instanceof StockError) {
      return { success: false, message: error.message };
    }

    return {
      success: false,
      message: "Unable to add stock. Please try again.",
    };
  }
}

export async function sellStockAction(
  productId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const quantity = parsePositiveInteger(String(formData.get("quantity") ?? ""));

  if (quantity === null) {
    return { success: false, message: "Please enter a valid quantity." };
  }

  try {
    await sellStock(productId, quantity);
    revalidateInventoryPaths(productId);
    return { success: true, message: "Stock sold successfully." };
  } catch (error) {
    if (error instanceof StockError) {
      return { success: false, message: error.message };
    }

    return {
      success: false,
      message: "Unable to sell stock. Please try again.",
    };
  }
}

async function saveProductImage(file: File): Promise<string> {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!allowedTypes.includes(file.type)) {
    throw new StockError("Please upload a valid image file.");
  }

  const extension = file.type.split("/")[1] ?? "jpg";
  const fileName = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  const filePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return `/uploads/products/${fileName}`;
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
