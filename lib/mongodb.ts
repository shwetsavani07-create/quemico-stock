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

const MONGODB_URI = process.env.MONGODB_URI?.trim();

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

function getMongoErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function buildMongoUri(uri: string): string {
  let result = uri;

  if (!result.includes("retryWrites=")) {
    result += result.includes("?")
        ? "&retryWrites=true"
        : "?retryWrites=true";
  }

  if (!result.includes("w=")) {
    result += result.includes("?")
        ? "&w=majority"
        : "?w=majority";
  }

  return result;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = buildMongoUri("MONGODB_URI");

  if (!cached.promise) {
    console.info("[mongodb] Connecting to MongoDB Atlas...");

    cached.promise = mongoose
        .connect(uri, {
          serverSelectionTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 0,
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