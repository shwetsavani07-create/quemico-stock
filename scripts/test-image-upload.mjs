import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

const PUBLIC_DNS = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];

function loadEnv() {
  const envFile = readFileSync(".env", "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1).replace(/^"|"$/g, "");
    process.env[key] = value;
  }
}

function resolveSrvRecords(host) {
  const resolver = new dns.Resolver();
  resolver.setServers(PUBLIC_DNS);

  return new Promise((resolve, reject) => {
    resolver.resolveSrv(`_mongodb._tcp.${host}`, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });
}

async function buildUri() {
  const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_HOST } = process.env;
  const db = process.env.MONGODB_DB ?? "quemico-stock";

  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST) {
    throw new Error("Missing MongoDB env vars");
  }

  const records = await resolveSrvRecords(MONGODB_HOST);
  const primary = [...records].sort(
    (a, b) => a.priority - b.priority || b.weight - a.weight,
  )[0];

  return `mongodb://${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}@${primary.name}:${primary.port}/${db}?ssl=true&authSource=admin&directConnection=true`;
}

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true },
);

const Product =
  mongoose.models.Product ?? mongoose.model("Product", ProductSchema);

async function saveTestImage(bytes, extension = "png") {
  const fileName = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  const filePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, bytes);

  return {
    publicPath: `/uploads/products/${fileName}`,
    filePath,
  };
}

async function main() {
  loadEnv();

  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  await mongoose.connect(await buildUri(), {
    serverSelectionTimeoutMS: 10000,
    family: 4,
  });

  const testName = `Upload Test ${Date.now()}`;
  let product = await Product.create({
    name: testName,
    lowStockThreshold: 10,
    image: null,
  });

  console.info("A. Created product:", product._id.toString());

  product = await Product.findByIdAndUpdate(
    product._id,
    { name: `${testName} Renamed`, lowStockThreshold: 12, image: product.image },
    { new: true },
  );

  if (!product || product.name !== `${testName} Renamed` || product.image !== null) {
    throw new Error("Name-only update failed");
  }
  console.info("B. Name-only update OK, image still null");

  const firstImage = await saveTestImage(pngBytes);
  product = await Product.findByIdAndUpdate(
    product._id,
    {
      name: product.name,
      lowStockThreshold: product.lowStockThreshold,
      image: firstImage.publicPath,
    },
    { new: true },
  );

  if (!product?.image || product.image !== firstImage.publicPath) {
    throw new Error("Image update failed");
  }
  console.info("C. Image path saved:", product.image);

  const diskImage = await readFile(firstImage.filePath);
  if (diskImage.length !== pngBytes.length) {
    throw new Error("Uploaded file not readable from disk");
  }
  console.info("D. Image file readable from public/uploads/products");

  product = await Product.findByIdAndUpdate(
    product._id,
    {
      name: `${testName} Final`,
      lowStockThreshold: 15,
      image: product.image,
    },
    { new: true },
  );

  if (!product?.image || product.image !== firstImage.publicPath) {
    throw new Error("Existing image was overwritten on edit without new file");
  }
  console.info("E. Edit without new image preserved existing image");

  const secondImage = await saveTestImage(pngBytes);
  product = await Product.findByIdAndUpdate(
    product._id,
    {
      name: product.name,
      lowStockThreshold: product.lowStockThreshold,
      image: secondImage.publicPath,
    },
    { new: true },
  );

  if (!product?.image || product.image !== secondImage.publicPath) {
    throw new Error("New image replace failed");
  }
  console.info("F. New image replaced old image:", product.image);

  await Product.findByIdAndDelete(product._id);
  await unlink(firstImage.filePath).catch(() => undefined);
  await unlink(secondImage.filePath).catch(() => undefined);

  console.info("All image upload/storage checks passed");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
