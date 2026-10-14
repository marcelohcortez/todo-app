import type { Collection } from "mongodb";
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
