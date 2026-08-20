import dns from "node:dns";
import mongoose from "mongoose";

// Use reliable public DNS — some local/IPv6 resolvers fail MongoDB Atlas SRV lookups.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

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

function getMongoErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function buildMongoUri(): string {
  const directUri = process.env.MONGODB_URI?.trim();

  if (directUri) {
    return ensureAtlasOptions(directUri);
  }

  const username = process.env.MONGODB_USERNAME?.trim();
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST?.trim();
  const dbName = process.env.MONGODB_DB?.trim() ?? "quemico-stock";

  if (username && password && host) {
    const uri = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/${dbName}?retryWrites=true&w=majority`;
    return ensureAtlasOptions(uri);
  }

  throw new Error("Please define the MONGODB_URI environment variable");
}

function ensureAtlasOptions(uri: string): string {
  if (uri.includes("authSource=")) {
    return uri;
  }

  const separator = uri.includes("?") ? "&" : "?";
  return `${uri}${separator}authSource=admin`;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  let uri: string;

  try {
    uri = buildMongoUri();
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
    console.error("[mongodb] Connection failed:", getMongoErrorMessage(error));
    throw error;
  }

  return cached.conn;
}
