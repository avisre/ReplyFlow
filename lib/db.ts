import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const globalCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = globalCache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Please define MONGODB_URI in your environment.");
  }

  if (globalCache.conn) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
