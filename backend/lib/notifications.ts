import { ObjectId } from "mongodb";
import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import type { NotificationData, NotificationDoc, NotificationType } from "./types";

let indexReady = false;

async function notificationsCollection(): Promise<Collection<NotificationDoc>> {
  const col = (await getDb()).collection<NotificationDoc>("notifications");
  if (!indexReady) {
    await col.createIndex({ userId: 1, readAt: 1, createdAt: -1 });
    indexReady = true;
  }
  return col;
}

export interface Notification {
  id: string;
  type: NotificationType;
  data: NotificationData;
  createdAt: string;
  read: boolean;
}

function toNotification(d: NotificationDoc): Notification {
  return { id: d._id.toHexString(), type: d.type, data: d.data, createdAt: d.createdAt.toISOString(), read: d.readAt !== null };
}

/**
 * Records a notification for `userId`. Always called alongside the notifyChanged() call for whatever
 * triggered it (a friend request, an acceptance, a new share) so the bell piggybacks on the existing
 * realtime ping instead of needing its own.
 */
export async function pushNotification(userId: string, type: NotificationType, data: NotificationData): Promise<void> {
  const doc: NotificationDoc = {
    _id: new ObjectId(),
    userId: new ObjectId(userId),
    type,
    data,
    createdAt: new Date(),
    readAt: null,
  };
  await (await notificationsCollection()).insertOne(doc);
}

export async function listRecentNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const docs = await (await notificationsCollection())
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  // Only fromUserId is stored; the sender's current email is resolved here, at read time.
  const fromIds = [...new Set(docs.map((d) => d.data.fromUserId).filter((id): id is string => Boolean(id)))];
  const emailById = fromIds.length
    ? new Map(
        (
          await (await getDb())
            .collection<{ _id: ObjectId; email: string }>("users")
            .find({ _id: { $in: fromIds.map((id) => new ObjectId(id)) } }, { projection: { email: 1 } })
            .toArray()
        ).map((u) => [u._id.toHexString(), u.email])
      )
    : new Map<string, string>();

  return docs.map((d) =>
    toNotification(
      d.data.fromUserId && emailById.has(d.data.fromUserId)
        ? { ...d, data: { ...d.data, fromEmail: emailById.get(d.data.fromUserId) } }
        : d
    )
  );
}

export async function unreadCount(userId: string): Promise<number> {
  return (await notificationsCollection()).countDocuments({ userId: new ObjectId(userId), readAt: null });
}

export async function markAllRead(userId: string): Promise<void> {
  await (await notificationsCollection()).updateMany(
    { userId: new ObjectId(userId), readAt: null },
    { $set: { readAt: new Date() } }
  );
}
