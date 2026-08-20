import dns from "node:dns";
import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

const PUBLIC_DNS = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];

function getMongoErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function ensureAtlasOptions(uri: string): string {
  if (uri.includes("authSource=")) {
    return uri;
  }

  const separator = uri.includes("?") ? "&" : "?";
  return `${uri}${separator}authSource=admin`;
}

function resolveSrvRecords(host: string): Promise<dns.SrvRecord[]> {
  const resolver = new dns.Resolver();
  resolver.setServers(PUBLIC_DNS);

  return new Promise((resolve, reject) => {
    resolver.resolveSrv(`_mongodb._tcp.${host}`, (error, addresses) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(addresses);
    });
  });
}

async function buildMongoUri(): Promise<string> {
  const directUri = process.env.MONGODB_URI?.trim();

  if (directUri) {
    return ensureAtlasOptions(directUri);
  }

  const username = process.env.MONGODB_USERNAME?.trim();
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST?.trim();
  const dbName = process.env.MONGODB_DB?.trim() ?? "quemico-stock";

  if (!username || !password || !host) {
    throw new Error(
      "Please define MONGODB_URI or MONGODB_USERNAME, MONGODB_PASSWORD, and MONGODB_HOST",
    );
  }

  const encodedUser = encodeURIComponent(username);
  const encodedPass = encodeURIComponent(password);

  const records = await resolveSrvRecords(host);

  if (records.length === 0) {
    throw new Error("No MongoDB SRV records found for Atlas cluster");
  }

  const primary = [...records].sort(
    (a, b) => a.priority - b.priority || b.weight - a.weight,
  )[0];

  return `mongodb://${encodedUser}:${encodedPass}@${primary.name}:${primary.port}/${dbName}?ssl=true&authSource=admin&directConnection=true`;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  let uri: string;

  try {
    uri = await buildMongoUri();
    console.info("[mongodb] MongoDB config loaded: yes");
  } catch (error) {
    console.error("[mongodb] Connection failed:", getMongoErrorMessage(error));
    throw error;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        family: 4,
      })
      .then((connection) => {
        console.info(
          "[mongodb] Connected to MongoDB Atlas:",
          connection.connection.name,
        );
        return connection;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        console.error(
          "[mongodb] Connection failed:",
          getMongoErrorMessage(error),
        );
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error("[mongodb] Connection failed:", getMongoErrorMessage(error));
    throw error;
  }

  return cached.conn;
}
