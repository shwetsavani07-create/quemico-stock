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

function getMongoErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
        "MONGODB_URI is missing. Please define it in .env.local.",
    );
  }

  if (
      !uri.startsWith("mongodb://") &&
      !uri.startsWith("mongodb+srv://")
  ) {
    throw new Error(
        'Invalid MONGODB_URI. It must start with "mongodb://" or "mongodb+srv://".',
    );
  }

  return uri;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = getMongoUri();

  if (!cached.promise) {
    console.log("[mongodb] Connecting to MongoDB...");

    cached.promise = mongoose
        .connect(uri, {
          serverSelectionTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 0,
          family: 4,
        })
        .then((connection) => {
          console.log(
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