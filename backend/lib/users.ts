import { ObjectId } from "mongodb";
import type { Collection } from "mongodb";
import bcrypt from "bcryptjs";
import { getDb } from "./mongodb";
import type { UserDoc } from "./types";

let indexesReady = false;

export async function usersCollection(): Promise<Collection<UserDoc>> {
  const col = (await getDb()).collection<UserDoc>("users");
  if (!indexesReady) {
    await col.createIndex({ email: 1 }, { unique: true });
    await col.createIndex({ mcpTokenHash: 1 }, { sparse: true });
    indexesReady = true;
  }
  return col;
}

/** The one account allowed to add users. Set ADMIN_EMAIL on the server to its email address. */
function adminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
}

export async function currentUser(userId: string): Promise<{ email: string; isAdmin: boolean } | null> {
  const user = await (await usersCollection()).findOne({ _id: new ObjectId(userId) }, { projection: { email: 1 } });
  if (!user) return null;
  return { email: user.email, isAdmin: user.email === adminEmail() };
}

/** Creates an account with a hashed password. Throws with code 11000 if the email is already taken. */
export async function createUser(email: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  const user: UserDoc = { _id: new ObjectId(), email, passwordHash, createdAt: new Date() };
  await (await usersCollection()).insertOne(user);
}
