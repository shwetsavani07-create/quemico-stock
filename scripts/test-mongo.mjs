import { readFileSync } from "node:fs";
import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

function loadEnv() {
  const envFile = readFileSync(".env", "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1).replace(/^"|"$/g, "");
    process.env[key] = value;
  }
}

function buildUri() {
  const direct = process.env.MONGODB_URI?.trim();
  if (direct) {
    return direct.includes("authSource=")
      ? direct
      : `${direct}${direct.includes("?") ? "&" : "?"}authSource=admin`;
  }
  const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_HOST } = process.env;
  const db = process.env.MONGODB_DB ?? "quemico-stock";
  if (MONGODB_USERNAME && MONGODB_PASSWORD && MONGODB_HOST) {
    return `mongodb+srv://${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}/${db}?retryWrites=true&w=majority&authSource=admin`;
  }
  throw new Error("MONGODB_URI not set");
}

async function main() {
  loadEnv();
  console.info("MONGODB_URI loaded:", process.env.MONGODB_URI ? "yes" : "no");

  try {
    await mongoose.connect(buildUri(), {
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
