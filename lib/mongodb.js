import { MongoClient } from "mongodb";

let client;

export async function connectDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (!global._mongoClientPromise) {
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
    });
    global._mongoClientPromise = client.connect();
  }

  try {
    const connectedClient = await global._mongoClientPromise;
    const db = connectedClient.db(process.env.MONGODB_DB); // explicit DB name from env
    return db;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
}
