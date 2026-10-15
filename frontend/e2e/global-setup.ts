import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import { ADMIN, DB_NAME, MONGO_URI } from "./env";

// Empties every collection in the test database (indexes are kept) and creates the admin account.
export default async function globalSetup() {
  if (!MONGO_URI) throw new Error("E2E_MONGODB_URI is not set");
  if (!DB_NAME.includes("e2e")) throw new Error(`E2E_MONGODB_DB must contain "e2e" (got "${DB_NAME}")`);

  const client = await new MongoClient(MONGO_URI).connect();
  try {
    const db = client.db(DB_NAME);
    for (const { name } of await db.listCollections().toArray()) {
      await db.collection(name).deleteMany({});
    }
    await db.collection("users").insertOne({
      _id: new ObjectId(),
      email: ADMIN.email,
      // A low cost keeps the tests fast. The app itself uses 12.
      passwordHash: await bcrypt.hash(ADMIN.password, 4),
      createdAt: new Date(),
    });
  } finally {
    await client.close();
  }
}
