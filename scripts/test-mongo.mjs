import { readFileSync } from "node:fs";
import dns from "node:dns";
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
  const direct = process.env.MONGODB_URI?.trim();
  if (direct) {
    return direct.includes("authSource=")
      ? direct
      : `${direct}${direct.includes("?") ? "&" : "?"}authSource=admin`;
  }

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

async function main() {
  loadEnv();
  console.info("MongoDB config loaded:", process.env.MONGODB_HOST ? "yes" : "no");

  try {
    await mongoose.connect(await buildUri(), {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });

    const productCount = await mongoose.connection.db
      .collection("products")
      .countDocuments();

    console.info("MongoDB connected OK");
    console.info("Database:", mongoose.connection.name);
    console.info("Products collection count:", productCount);

    await mongoose.disconnect();
  } catch (error) {
    if (error instanceof Error) {
      console.error("FAIL:", error.name, error.message);
    } else {
      console.error("FAIL:", error);
    }
    process.exit(1);
  }
}

main();
