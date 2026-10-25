import { ObjectId } from "mongodb";
import type { Collection, Document, Filter } from "mongodb";
import { boardIdsNamed, createBoard } from "./boards";
import { getDb } from "./mongodb";
import { PAGE_SIZE, pageOf } from "./pagination";
import { escapeRegex } from "./search";
import { deleteSharesForItem, notifyAccess, resolveTaskAccess } from "./shares";
import { PRIORITIES, PRIORITY_RANK } from "./types";
import type { Priority, Task, TaskDoc } from "./types";

export type StatusFilter = "active" | "done" | "all";

export interface TaskPatch {
  title?: string;
  priority?: Priority;
  // A board id, or null to take the task off its board.
  boardId?: string | null;
  completed?: boolean;
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}

export function isStatusFilter(value: unknown): value is StatusFilter {
  return value === "active" || value === "done" || value === "all";
}

/** Returns the trimmed title, or null if it is empty or too long. */
export function cleanTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length === 0 || t.length > 500 ? null : t;
}

export function toTask(d: TaskDoc): Task {
  return {
    id: d._id.toHexString(),
    title: d.title,
    priority: d.priority,
    boardId: d.boardId ? d.boardId.toHexString() : null,
    completed: d.completed,
    createdAt: d.createdAt.toISOString(),
    completedAt: d.completedAt ? d.completedAt.toISOString() : null,
    updatedAt: d.updatedAt.toISOString(),
  };
}

async function tasksCollection(): Promise<Collection<TaskDoc>> {
  return (await getDb()).collection<TaskDoc>("tasks");
}

// Completed tasks are shown for this many days, then deleted from the database.
export const DONE_RETENTION_DAYS = 30;

function doneCutoff(): Date {
  return new Date(Date.now() - DONE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

// A task saved without completedAt falls back to updatedAt, so it is not kept forever.
function doneBefore(cutoff: Date): Filter<TaskDoc> {
  return {
    completed: true,
    $or: [{ completedAt: { $lt: cutoff } }, { completedAt: null, updatedAt: { $lt: cutoff } }],
  };
}

function doneSince(cutoff: Date): Filter<TaskDoc> {
  return {
    completed: true,
    $or: [{ completedAt: { $gte: cutoff } }, { completedAt: null, updatedAt: { $gte: cutoff } }],
  };
}

/** Deletes completed tasks older than the retention period. With a userId, only that user's tasks. */
export async function purgeExpiredDoneTasks(userId?: string): Promise<number> {
  const filter = doneBefore(doneCutoff());
  if (userId) filter.userId = new ObjectId(userId);
  const res = await (await tasksCollection()).deleteMany(filter);
  return res.deletedCount;
}

// The tasks a list shows. `boardId` limits it to one board: null for tasks with no board, undefined for all.
// `query` keeps the tasks whose title contains it, or that sit on a board whose name contains it (ignoring case).
// boardIds are the boards that match the query. $and keeps this apart from the $or used for the done window.
function taskFilter(
  userId: string,
  status: StatusFilter,
  boardId: string | null | undefined,
  query: string | undefined,
  boardIds: ObjectId[]
): Filter<TaskDoc> {
  const filter: Filter<TaskDoc> = { userId: new ObjectId(userId) };
  if (status === "active") filter.completed = false;
  if (status === "done") Object.assign(filter, doneSince(doneCutoff()));
  if (boardId === null) filter.boardId = null;
  else if (boardId !== undefined) filter.boardId = new ObjectId(boardId);
  if (query) {
    const matches: Filter<TaskDoc>[] = [{ title: { $regex: escapeRegex(query), $options: "i" } }];
    if (boardIds.length > 0) matches.push({ boardId: { $in: boardIds } });
    filter.$and = [{ $or: matches }];
  }
  return filter;
}

export interface TaskPage {
  tasks: Task[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * One page of the list, PAGE_SIZE tasks each. Sorted like listTasks. The id is a tie-breaker, so pages never overlap.
 */
export async function listTaskPage(
  userId: string,
  status: StatusFilter,
  boardId: string | null | undefined,
  requestedPage: number,
  query?: string
): Promise<TaskPage> {
  await purgeExpiredDoneTasks(userId);

  const boardIds = query ? await boardIdsNamed(userId, query) : [];
  const filter = taskFilter(userId, status, boardId, query, boardIds);
  const col = await tasksCollection();
  const total = await col.countDocuments(filter);
  const { page, pageCount, skip } = pageOf(total, requestedPage);

  const pipeline: Document[] = [{ $match: filter }];
  if (status === "done") {
    pipeline.push({ $sort: { completedAt: -1, _id: -1 } });
  } else {
    // Same order as listTasks: high, medium, normal, then newest first.
    pipeline.push(
      { $addFields: { rank: { $indexOfArray: [PRIORITIES, "$priority"] } } },
      { $sort: { rank: 1, createdAt: -1, _id: -1 } }
    );
  }
  pipeline.push({ $skip: skip }, { $limit: PAGE_SIZE });

  const docs = await col.aggregate<TaskDoc>(pipeline).toArray();
  return { tasks: docs.map(toTask), total, page, pageCount };
}

/**
 * `boardId` limits the list to one board. Pass null for tasks with no board, or leave it undefined for all tasks.
 */
export async function listTasks(
  userId: string,
  status: StatusFilter = "active",
  boardId?: string | null
): Promise<Task[]> {
  await purgeExpiredDoneTasks(userId);

  const filter = taskFilter(userId, status, boardId, undefined, []);
  const docs = await (await tasksCollection()).find(filter).toArray();

  if (status === "done") {
    // Most recently completed first.
    docs.sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
  } else {
    // High → medium → normal, then newest first within each group.
    docs.sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  return docs.map(toTask);
}

/** True if the task exists and belongs to this user directly (not merely shared with them). */
export async function taskBelongsToUser(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const doc = await (await tasksCollection()).findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  return doc !== null;
}

export const DEFAULT_BOARD_NAME = "general";

/** Creates a task. Without a board it goes to the "general" board, which is created if it does not exist yet. */
export async function createTask(
  userId: string,
  title: string,
  priority: Priority,
  boardId: string | null
): Promise<Task> {
  const now = new Date();
  const targetBoardId = boardId ?? (await createBoard(userId, DEFAULT_BOARD_NAME)).id;
  const doc: TaskDoc = {
    _id: new ObjectId(),
    userId: new ObjectId(userId),
    title,
    priority,
    boardId: new ObjectId(targetBoardId),
    completed: false,
    createdAt: now,
    completedAt: null,
    updatedAt: now,
  };
  await (await tasksCollection()).insertOne(doc);
  await notifyAccess(userId, { boardId: targetBoardId, taskId: doc._id.toHexString() });
  return toTask(doc);
}

// `userId` is whoever is making the change: the owner, or a friend with access to the task (directly,
// or through its board). When it is a friend, the update is applied under the owner's id instead, and
// everyone with access — owner and friends alike — is notified to refetch.
export async function updateTask(userId: string, id: string, patch: TaskPatch): Promise<Task | null> {
  if (!ObjectId.isValid(id)) return null;

  const now = new Date();
  const set: Partial<TaskDoc> = { updatedAt: now };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.boardId !== undefined) set.boardId = patch.boardId ? new ObjectId(patch.boardId) : null;
  if (patch.completed !== undefined) {
    set.completed = patch.completed;
    set.completedAt = patch.completed ? now : null;
  }

  const col = await tasksCollection();
  let ownerId = userId;
  let doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id), userId: new ObjectId(userId) },
    { $set: set },
    { returnDocument: "after" }
  );
  if (!doc) {
    const access = await resolveTaskAccess(userId, id);
    if (!access) return null;
    // Only the owner may move a task to another board, even when the caller reaches this
    // through a surface (like the MCP tools) that has no HTTP-layer check of its own.
    if (patch.boardId !== undefined) return null;
    ownerId = access.ownerId;
    doc = await col.findOneAndUpdate(
      { _id: new ObjectId(id), userId: new ObjectId(ownerId) },
      { $set: set },
      { returnDocument: "after" }
    );
    if (!doc) return null;
  }

  await notifyAccess(ownerId, { boardId: doc.boardId ? doc.boardId.toHexString() : null, taskId: id });
  return toTask(doc);
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const oid = new ObjectId(id);
  const col = await tasksCollection();

  let ownerId = userId;
  let doc = await col.findOneAndDelete({ _id: oid, userId: new ObjectId(userId) });
  if (!doc) {
    const access = await resolveTaskAccess(userId, id);
    if (!access) return false;
    ownerId = access.ownerId;
    doc = await col.findOneAndDelete({ _id: oid, userId: new ObjectId(ownerId) });
    if (!doc) return false;
  }

  await deleteSharesForItem("task", id);
  await notifyAccess(ownerId, { boardId: doc.boardId ? doc.boardId.toHexString() : null, taskId: id });
  return true;
}
