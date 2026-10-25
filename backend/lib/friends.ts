import { ObjectId } from "mongodb";
import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import { notifyChanged } from "./realtime";
import { pushNotification } from "./notifications";
import { removeSharesBetween } from "./shares";
import { findUserByEmail } from "./users";
import type { FriendshipDoc } from "./types";

let indexesReady = false;

async function friendshipsCollection(): Promise<Collection<FriendshipDoc>> {
  const col = (await getDb()).collection<FriendshipDoc>("friendships");
  if (!indexesReady) {
    await col.createIndex({ requesterId: 1, recipientId: 1 });
    await col.createIndex({ recipientId: 1, requesterId: 1 });
    indexesReady = true;
  }
  return col;
}

/** The friendship doc between these two users, in either direction, if one exists. */
async function findBetween(userIdA: string, userIdB: string): Promise<FriendshipDoc | null> {
  const a = new ObjectId(userIdA);
  const b = new ObjectId(userIdB);
  return (await friendshipsCollection()).findOne({
    $or: [
      { requesterId: a, recipientId: b },
      { requesterId: b, recipientId: a },
    ],
  });
}

export async function areFriends(userIdA: string, userIdB: string): Promise<boolean> {
  const doc = await findBetween(userIdA, userIdB);
  return doc?.status === "accepted";
}

/**
 * Sends a friend request to whoever holds this email. Resolves silently (no error, no signal to the
 * caller either way) when the email has no account, already belongs to the caller, or a friendship
 * already exists in some form — the route always replies with the same generic message so the field
 * can't be used to probe which emails have accounts.
 *
 * If the other person already sent a pending request to the caller, this accepts it instead of
 * creating a second one, since both people now want to be friends.
 */
export async function requestFriend(requesterId: string, email: string): Promise<void> {
  const target = await findUserByEmail(email);
  if (!target || target.id === requesterId) return;

  const existing = await findBetween(requesterId, target.id);
  if (existing) {
    if (existing.status === "accepted") return;
    // A pending request already exists. If it runs the other way, both people want this: accept it.
    if (existing.requesterId.toHexString() === target.id) {
      await (await friendshipsCollection()).updateOne(
        { _id: existing._id },
        { $set: { status: "accepted", respondedAt: new Date() } }
      );
      await pushNotification(target.id, "friend_accepted", { fromUserId: requesterId });
      await notifyChanged(target.id);
      await notifyChanged(requesterId);
    }
    // Otherwise the caller already has a pending request out to this person; nothing to do.
    return;
  }

  const doc: FriendshipDoc = {
    _id: new ObjectId(),
    requesterId: new ObjectId(requesterId),
    recipientId: new ObjectId(target.id),
    status: "pending",
    createdAt: new Date(),
    respondedAt: null,
  };
  await (await friendshipsCollection()).insertOne(doc);
  await pushNotification(target.id, "friend_request", { fromUserId: requesterId });
  await notifyChanged(target.id);
}

export interface FriendEntry {
  friendshipId: string;
  userId: string;
  email: string;
  createdAt: string;
}

export interface FriendState {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

/** This user's accepted friends, plus the requests they've sent and received that are still pending. */
export async function listFriendState(userId: string): Promise<FriendState> {
  const uid = new ObjectId(userId);
  const docs = await (await friendshipsCollection())
    .find({ $or: [{ requesterId: uid }, { recipientId: uid }] })
    .sort({ createdAt: -1 })
    .toArray();

  const otherIds = docs.map((d) => (d.requesterId.toHexString() === userId ? d.recipientId : d.requesterId));
  const users = otherIds.length
    ? await (await getDb())
        .collection<{ _id: ObjectId; email: string }>("users")
        .find({ _id: { $in: otherIds } }, { projection: { email: 1 } })
        .toArray()
    : [];
  const emailById = new Map(users.map((u) => [u._id.toHexString(), u.email]));

  const friends: FriendEntry[] = [];
  const incoming: FriendEntry[] = [];
  const outgoing: FriendEntry[] = [];
  for (const d of docs) {
    const isRequester = d.requesterId.toHexString() === userId;
    const otherId = (isRequester ? d.recipientId : d.requesterId).toHexString();
    const entry: FriendEntry = {
      friendshipId: d._id.toHexString(),
      userId: otherId,
      email: emailById.get(otherId) ?? "",
      createdAt: d.createdAt.toISOString(),
    };
    if (d.status === "accepted") friends.push(entry);
    else if (isRequester) outgoing.push(entry);
    else incoming.push(entry);
  }
  return { friends, incoming, outgoing };
}

export type FriendshipResult = "ok" | "not_found";

/** Accepts a pending request. Only the recipient may accept. */
export async function acceptFriendRequest(userId: string, friendshipId: string): Promise<FriendshipResult> {
  if (!ObjectId.isValid(friendshipId)) return "not_found";
  const col = await friendshipsCollection();
  const doc = await col.findOne({ _id: new ObjectId(friendshipId), recipientId: new ObjectId(userId), status: "pending" });
  if (!doc) return "not_found";

  await col.updateOne({ _id: doc._id }, { $set: { status: "accepted", respondedAt: new Date() } });
  const requesterId = doc.requesterId.toHexString();
  await pushNotification(requesterId, "friend_accepted", { fromUserId: userId });
  await notifyChanged(requesterId);
  await notifyChanged(userId);
  return "ok";
}

/**
 * Removes a friendship doc: declines or cancels a pending request, or ends an accepted friendship.
 * Either party may call this. On success, any shares between the two people are also removed, since
 * sharing requires being friends.
 */
export async function removeFriendship(userId: string, friendshipId: string): Promise<FriendshipResult> {
  if (!ObjectId.isValid(friendshipId)) return "not_found";
  const uid = new ObjectId(userId);
  const col = await friendshipsCollection();
  const doc = await col.findOne({ _id: new ObjectId(friendshipId), $or: [{ requesterId: uid }, { recipientId: uid }] });
  if (!doc) return "not_found";

  await col.deleteOne({ _id: doc._id });
  const otherId = (doc.requesterId.toHexString() === userId ? doc.recipientId : doc.requesterId).toHexString();

  // Sharing requires being friends, so a severed friendship takes any shares between them with it.
  await removeSharesBetween(userId, otherId);

  await notifyChanged(otherId);
  return "ok";
}
