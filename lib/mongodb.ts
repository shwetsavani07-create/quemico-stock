import dns from "node:dns";
import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

// Use reliable public DNS servers for MongoDB SRV resolution.
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
]);

function getMongoErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (
      !uri.startsWith("mongodb://") &&
      !uri.startsWith("mongodb+srv://")
  ) {
    throw new Error(
        "MONGODB_URI must start with mongodb:// or mongodb+srv://",
    );
  }

  if (!cached.promise) {
    console.info("[mongodb] Connecting to MongoDB...");

    cached.promise = mongoose
        .connect(uri, {
          serverSelectionTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 0,
          family: 4,
        })
        .then((connection) => {
          console.info(
              "[mongodb] Connected successfully:",
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
    throw error;
  }

  return cached.conn;
}