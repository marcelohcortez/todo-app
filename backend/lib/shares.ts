import { ObjectId } from "mongodb";
import type { Collection, Filter } from "mongodb";
import { toBoard } from "./boards";
import { areFriends } from "./friends";
import { getDb } from "./mongodb";
import { pushNotification } from "./notifications";
import { toNote } from "./notes";
import { PAGE_SIZE, pageOf } from "./pagination";
import { notifyChanged } from "./realtime";
import { listTaskPage, toTask } from "./tasks";
import type { StatusFilter, TaskPage } from "./tasks";
import type { Board, BoardDoc, Note, NoteDoc, ShareDoc, TaskDoc } from "./types";

let indexesReady = false;

async function sharesCollection(): Promise<Collection<ShareDoc>> {
  const col = (await getDb()).collection<ShareDoc>("shares");
  if (!indexesReady) {
    await col.createIndex({ friendId: 1, kind: 1, itemId: 1 });
    await col.createIndex({ ownerId: 1, kind: 1, itemId: 1 });
    indexesReady = true;
  }
  return col;
}

const COLLECTION_BY_KIND: Record<ShareDoc["kind"], string> = { board: "boards", task: "tasks", note: "notes" };

/** The owner of a board, task, or note, regardless of who is asking. Null if the item does not exist. */
async function ownerOf(kind: ShareDoc["kind"], itemId: string): Promise<string | null> {
  if (!ObjectId.isValid(itemId)) return null;
  const doc = await (await getDb())
    .collection<{ _id: ObjectId; userId: ObjectId }>(COLLECTION_BY_KIND[kind])
    .findOne({ _id: new ObjectId(itemId) }, { projection: { userId: 1 } });
  return doc ? doc.userId.toHexString() : null;
}

export type ShareResult = "ok" | "not_found" | "not_friends";

/** Shares a board, task, or note the caller owns with a friend. Safe to call again; it will not duplicate. */
export async function shareItem(
  ownerId: string,
  friendId: string,
  kind: ShareDoc["kind"],
  itemId: string
): Promise<ShareResult> {
  if (!ObjectId.isValid(itemId) || !ObjectId.isValid(friendId)) return "not_found";
  if ((await ownerOf(kind, itemId)) !== ownerId) return "not_found";
  if (!(await areFriends(ownerId, friendId))) return "not_friends";

  await (await sharesCollection()).updateOne(
    { ownerId: new ObjectId(ownerId), friendId: new ObjectId(friendId), kind, itemId: new ObjectId(itemId) },
    { $setOnInsert: { _id: new ObjectId(), createdAt: new Date() } },
    { upsert: true }
  );
  await pushNotification(friendId, "share", { fromUserId: ownerId, kind, itemId });
  await notifyChanged(friendId);
  return "ok";
}

export interface ItemShare {
  shareId: string;
  friendId: string;
  friendEmail: string;
}

/** Who an item the caller owns is currently shared with. Empty if the caller does not own it. */
export async function sharesForItem(ownerId: string, kind: ShareDoc["kind"], itemId: string): Promise<ItemShare[]> {
  if (!ObjectId.isValid(itemId)) return [];
  const docs = await (await sharesCollection())
    .find({ ownerId: new ObjectId(ownerId), kind, itemId: new ObjectId(itemId) })
    .toArray();
  const emailByFriend = await emailsByUserId(docs.map((d) => d.friendId));
  return docs.map((d) => ({
    shareId: d._id.toHexString(),
    friendId: d.friendId.toHexString(),
    friendEmail: emailByFriend.get(d.friendId.toHexString()) ?? "",
  }));
}

/** Removes a share. Either the owner or the friend it was shared with may do this. */
export async function unshareItem(requesterId: string, shareId: string): Promise<boolean> {
  if (!ObjectId.isValid(shareId)) return false;
  const uid = new ObjectId(requesterId);
  const col = await sharesCollection();
  const doc = await col.findOne({ _id: new ObjectId(shareId), $or: [{ ownerId: uid }, { friendId: uid }] });
  if (!doc) return false;

  await col.deleteOne({ _id: doc._id });
  const otherId = (doc.ownerId.toHexString() === requesterId ? doc.friendId : doc.ownerId).toHexString();
  await notifyChanged(otherId);
  return true;
}

/** Removes every share for one item. Called when that item is deleted. */
export async function deleteSharesForItem(kind: ShareDoc["kind"], itemId: string): Promise<void> {
  if (!ObjectId.isValid(itemId)) return;
  await (await sharesCollection()).deleteMany({ kind, itemId: new ObjectId(itemId) });
}

/** Removes every share for several items of the same kind at once. Called on a bulk delete. */
export async function deleteSharesForItems(kind: ShareDoc["kind"], itemIds: ObjectId[]): Promise<void> {
  if (itemIds.length === 0) return;
  await (await sharesCollection()).deleteMany({ kind, itemId: { $in: itemIds } });
}

/** Removes every share between two people. Called when they stop being friends. */
export async function removeSharesBetween(userIdA: string, userIdB: string): Promise<void> {
  const a = new ObjectId(userIdA);
  const b = new ObjectId(userIdB);
  await (await sharesCollection()).deleteMany({
    $or: [
      { ownerId: a, friendId: b },
      { ownerId: b, friendId: a },
    ],
  });
}

export interface Access {
  ownerId: string;
}

export interface OwnerFallbackResult<T> {
  ownerId: string;
  value: T;
}

/**
 * Runs `op` as the caller first (the common case: they own the item). If that finds nothing,
 * resolves the caller's shared access and retries `op` under the real owner's id instead. Used
 * by every task/note write that a friend may also perform via a share.
 */
export async function withOwnerFallback<T>(
  userId: string,
  id: string,
  resolveAccess: (userId: string, id: string) => Promise<Access | null>,
  op: (ownerId: string) => Promise<T | null>
): Promise<OwnerFallbackResult<T> | null> {
  const direct = await op(userId);
  if (direct !== null) return { ownerId: userId, value: direct };

  const access = await resolveAccess(userId, id);
  if (!access) return null;
  const viaShare = await op(access.ownerId);
  if (viaShare === null) return null;
  return { ownerId: access.ownerId, value: viaShare };
}

// Access is a single level: there is no view-only vs. edit vs. owner distinction. Sharing a task or
// note is intentionally full collaborator access, including deleting it — the same as sharing a
// board already implies for every task on it. A friend who shouldn't have that can be unshared
// (see unshareItem) or removed as a friend (see removeFriendship), which also removes the share.
/** Whether `requestingUserId` may read/edit/delete this task: they own it, or it (or its board) is shared with them. */
export async function resolveTaskAccess(requestingUserId: string, taskId: string): Promise<Access | null> {
  if (!ObjectId.isValid(taskId)) return null;
  const doc = await (await getDb())
    .collection<Pick<TaskDoc, "_id" | "userId" | "boardId">>("tasks")
    .findOne({ _id: new ObjectId(taskId) }, { projection: { userId: 1, boardId: 1 } });
  if (!doc) return null;

  const ownerId = doc.userId.toHexString();
  if (ownerId === requestingUserId) return { ownerId };

  const col = await sharesCollection();
  const friendId = new ObjectId(requestingUserId);
  const direct = await col.findOne({ ownerId: doc.userId, friendId, kind: "task", itemId: doc._id });
  if (direct) return { ownerId };
  if (doc.boardId) {
    const viaBoard = await col.findOne({ ownerId: doc.userId, friendId, kind: "board", itemId: doc.boardId });
    if (viaBoard) return { ownerId };
  }
  return null;
}

// Same single-level access as resolveTaskAccess above: sharing a note includes letting the friend delete it.
/** Whether `requestingUserId` may read/edit/delete this note: they own it, or it is shared with them directly. */
export async function resolveNoteAccess(requestingUserId: string, noteId: string): Promise<Access | null> {
  if (!ObjectId.isValid(noteId)) return null;
  const doc = await (await getDb())
    .collection<Pick<NoteDoc, "_id" | "userId">>("notes")
    .findOne({ _id: new ObjectId(noteId) }, { projection: { userId: 1 } });
  if (!doc) return null;

  const ownerId = doc.userId.toHexString();
  if (ownerId === requestingUserId) return { ownerId };

  const shared = await (await sharesCollection()).findOne({
    ownerId: doc.userId,
    friendId: new ObjectId(requestingUserId),
    kind: "note",
    itemId: doc._id,
  });
  return shared ? { ownerId } : null;
}

/** Whether `requestingUserId` may view this board's tasks: they own it, or the board is shared with them. */
export async function resolveBoardViewAccess(requestingUserId: string, boardId: string): Promise<Access | null> {
  if (!ObjectId.isValid(boardId)) return null;
  const doc = await (await getDb())
    .collection<Pick<BoardDoc, "_id" | "userId">>("boards")
    .findOne({ _id: new ObjectId(boardId) }, { projection: { userId: 1 } });
  if (!doc) return null;

  const ownerId = doc.userId.toHexString();
  if (ownerId === requestingUserId) return { ownerId };

  const shared = await (await sharesCollection()).findOne({
    ownerId: doc.userId,
    friendId: new ObjectId(requestingUserId),
    kind: "board",
    itemId: doc._id,
  });
  return shared ? { ownerId } : null;
}

/**
 * Tells everyone with a reason to care that something under `ownerId` changed: the owner, and whoever
 * the task/board/note is shared with (directly, or via the task's board). Replaces a bare notifyChanged()
 * call wherever the changed item might be shared.
 */
export async function notifyAccess(
  ownerId: string,
  target: { boardId?: string | null; taskId?: string; noteId?: string }
): Promise<void> {
  const ids = new Set<string>([ownerId]);
  const owner = new ObjectId(ownerId);

  const queries: Filter<ShareDoc>[] = [];
  if (target.taskId) queries.push({ ownerId: owner, kind: "task", itemId: new ObjectId(target.taskId) });
  if (target.boardId) queries.push({ ownerId: owner, kind: "board", itemId: new ObjectId(target.boardId) });
  if (target.noteId) queries.push({ ownerId: owner, kind: "note", itemId: new ObjectId(target.noteId) });

  if (queries.length > 0) {
    const shares = await (await sharesCollection()).find({ $or: queries }).toArray();
    shares.forEach((s) => ids.add(s.friendId.toHexString()));
  }
  await Promise.all([...ids].map((id) => notifyChanged(id)));
}

/**
 * Like notifyAccess, but for several tasks at once that moved to a new board together (so none of
 * them have their own boardId to check anymore). Pings the owner plus anyone with a direct share
 * on any of these tasks; a board-level share is handled separately by whoever deletes that board.
 */
export async function notifyAccessForTasks(ownerId: string, taskIds: string[]): Promise<void> {
  const ids = new Set<string>([ownerId]);
  if (taskIds.length > 0) {
    const shares = await (await sharesCollection())
      .find({ ownerId: new ObjectId(ownerId), kind: "task", itemId: { $in: taskIds.map((id) => new ObjectId(id)) } })
      .toArray();
    shares.forEach((s) => ids.add(s.friendId.toHexString()));
  }
  await Promise.all([...ids].map((id) => notifyChanged(id)));
}

async function emailsByUserId(userIds: ObjectId[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const users = await (await getDb())
    .collection<{ _id: ObjectId; email: string }>("users")
    .find({ _id: { $in: userIds } }, { projection: { email: 1 } })
    .toArray();
  return new Map(users.map((u) => [u._id.toHexString(), u.email]));
}

export interface SharedBoardsPage {
  boards: (Board & { ownerEmail: string })[];
  total: number;
  page: number;
  pageCount: number;
}

/** Boards shared with `userId` by a friend, newest share first. */
export async function sharedBoardsWithMe(userId: string, requestedPage: number): Promise<SharedBoardsPage> {
  const shares = await (await sharesCollection())
    .find({ friendId: new ObjectId(userId), kind: "board" })
    .sort({ createdAt: -1 })
    .toArray();
  const total = shares.length;
  const { page, pageCount, skip } = pageOf(total, requestedPage);
  const pageShares = shares.slice(skip, skip + PAGE_SIZE);

  const [boardDocs, emailByOwner] = await Promise.all([
    pageShares.length
      ? (await getDb())
          .collection<BoardDoc>("boards")
          .find({ _id: { $in: pageShares.map((s) => s.itemId) } })
          .toArray()
      : Promise.resolve([]),
    emailsByUserId(pageShares.map((s) => s.ownerId)),
  ]);
  const boardById = new Map(boardDocs.map((b) => [b._id.toHexString(), b]));

  const boards = pageShares
    .map((s) => {
      const board = boardById.get(s.itemId.toHexString());
      if (!board) return null;
      return { ...toBoard(board), ownerEmail: emailByOwner.get(s.ownerId.toHexString()) ?? "" };
    })
    .filter((b): b is Board & { ownerEmail: string } => b !== null);

  return { boards, total, page, pageCount };
}

export interface SharedTasksPage {
  tasks: (ReturnType<typeof toTask> & { ownerEmail: string })[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Tasks shared with `userId` one at a time (not via a shared board). A task whose board is also shared
 * with `userId` is left out here, since it already shows up under that board.
 */
export async function sharedTasksWithMe(userId: string, requestedPage: number): Promise<SharedTasksPage> {
  const friendId = new ObjectId(userId);
  const [taskShares, boardShares] = await Promise.all([
    (await sharesCollection()).find({ friendId, kind: "task" }).sort({ createdAt: -1 }).toArray(),
    (await sharesCollection()).find({ friendId, kind: "board" }).toArray(),
  ]);
  const sharedBoardIds = new Set(boardShares.map((s) => s.itemId.toHexString()));

  const taskDocs = taskShares.length
    ? await (await getDb())
        .collection<TaskDoc>("tasks")
        .find({ _id: { $in: taskShares.map((s) => s.itemId) } })
        .toArray()
    : [];
  const taskById = new Map(taskDocs.map((t) => [t._id.toHexString(), t]));

  const visible = taskShares.filter((s) => {
    const task = taskById.get(s.itemId.toHexString());
    return task && !(task.boardId && sharedBoardIds.has(task.boardId.toHexString()));
  });

  const total = visible.length;
  const { page, pageCount, skip } = pageOf(total, requestedPage);
  const pageShares = visible.slice(skip, skip + PAGE_SIZE);
  const emailByOwner = await emailsByUserId(pageShares.map((s) => s.ownerId));

  const tasks = pageShares.map((s) => ({
    ...toTask(taskById.get(s.itemId.toHexString())!),
    ownerEmail: emailByOwner.get(s.ownerId.toHexString()) ?? "",
  }));

  return { tasks, total, page, pageCount };
}

export interface SharedNotesPage {
  notes: (Note & { ownerEmail: string })[];
  total: number;
  page: number;
  pageCount: number;
}

/** Notes shared with `userId` one at a time, newest share first. */
export async function sharedNotesWithMe(userId: string, requestedPage: number): Promise<SharedNotesPage> {
  const shares = await (await sharesCollection())
    .find({ friendId: new ObjectId(userId), kind: "note" })
    .sort({ createdAt: -1 })
    .toArray();
  const total = shares.length;
  const { page, pageCount, skip } = pageOf(total, requestedPage);
  const pageShares = shares.slice(skip, skip + PAGE_SIZE);

  const [noteDocs, emailByOwner] = await Promise.all([
    pageShares.length
      ? (await getDb())
          .collection<NoteDoc>("notes")
          .find({ _id: { $in: pageShares.map((s) => s.itemId) } })
          .toArray()
      : Promise.resolve([]),
    emailsByUserId(pageShares.map((s) => s.ownerId)),
  ]);
  const noteById = new Map(noteDocs.map((n) => [n._id.toHexString(), n]));

  const notes = pageShares
    .map((s) => {
      const note = noteById.get(s.itemId.toHexString());
      if (!note) return null;
      return { ...toNote(note), ownerEmail: emailByOwner.get(s.ownerId.toHexString()) ?? "" };
    })
    .filter((n): n is Note & { ownerEmail: string } => n !== null);

  return { notes, total, page, pageCount };
}

/** One page of a shared board's tasks, for a user it has been shared with (or its owner). */
export async function tasksOnSharedBoard(
  userId: string,
  boardId: string,
  status: StatusFilter,
  page: number
): Promise<TaskPage | null> {
  const access = await resolveBoardViewAccess(userId, boardId);
  if (!access) return null;
  return listTaskPage(access.ownerId, status, boardId, page);
}

export interface SharedByMeEntry {
  shareId: string;
  kind: ShareDoc["kind"];
  itemId: string;
  name: string;
  friendEmail: string;
  createdAt: string;
}

export interface SharedByMePage {
  shares: SharedByMeEntry[];
  total: number;
  page: number;
  pageCount: number;
}

/** Everything `userId` has shared out, each with who it was shared with, newest first. */
export async function sharedByMe(userId: string, requestedPage: number): Promise<SharedByMePage> {
  const shares = await (await sharesCollection())
    .find({ ownerId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
  const total = shares.length;
  const { page, pageCount, skip } = pageOf(total, requestedPage);
  const pageShares = shares.slice(skip, skip + PAGE_SIZE);

  const byKind: Record<ShareDoc["kind"], ObjectId[]> = { board: [], task: [], note: [] };
  pageShares.forEach((s) => byKind[s.kind].push(s.itemId));

  const db = await getDb();
  const [boardDocs, taskDocs, noteDocs, emailByFriend] = await Promise.all([
    byKind.board.length ? db.collection<BoardDoc>("boards").find({ _id: { $in: byKind.board } }).toArray() : [],
    byKind.task.length ? db.collection<TaskDoc>("tasks").find({ _id: { $in: byKind.task } }).toArray() : [],
    byKind.note.length ? db.collection<NoteDoc>("notes").find({ _id: { $in: byKind.note } }).toArray() : [],
    emailsByUserId(pageShares.map((s) => s.friendId)),
  ]);
  const nameById = new Map<string, string>([
    ...boardDocs.map((b) => [b._id.toHexString(), b.name] as const),
    ...taskDocs.map((t) => [t._id.toHexString(), t.title] as const),
    ...noteDocs.map((n) => [n._id.toHexString(), n.body.slice(0, 80)] as const),
  ]);

  const result = pageShares
    .map((s) => {
      const name = nameById.get(s.itemId.toHexString());
      if (name === undefined) return null;
      const entry: SharedByMeEntry = {
        shareId: s._id.toHexString(),
        kind: s.kind,
        itemId: s.itemId.toHexString(),
        name,
        friendEmail: emailByFriend.get(s.friendId.toHexString()) ?? "",
        createdAt: s.createdAt.toISOString(),
      };
      return entry;
    })
    .filter((e): e is SharedByMeEntry => e !== null);

  return { shares: result, total, page, pageCount };
}
