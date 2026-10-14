import { MongoClient, Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

// Reuse one client across hot reloads and Vercel serverless invocations.
export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  const promise =
    global.__mongoClientPromise ?? (global.__mongoClientPromise = new MongoClient(uri).connect());

  let client: MongoClient;
  try {
    client = await promise;
  } catch (err) {
    global.__mongoClientPromise = undefined; // allow a retry on the next request
    throw err;
  }
  return client.db(process.env.MONGODB_DB || "todo");
}
