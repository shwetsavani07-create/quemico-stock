import { readFileSync } from "node:fs";
import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

function loadEnv() {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
}

async function main() {
  loadEnv();
  const user = process.env.MONGODB_USERNAME;
  const pass = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST;
  const db = process.env.MONGODB_DB ?? "quemico-stock";

  const records = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  const primary = records[0];
  const uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${primary.name}:${primary.port}/${db}?ssl=true&authSource=admin&directConnection=true`;

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, family: 4 });
  console.log("OK directConnection to", primary.name);
  const count = await mongoose.connection.db.collection("products").countDocuments();
  console.log("products:", count);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
