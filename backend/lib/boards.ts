import { ObjectId } from "mongodb";
import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import { notifyChanged } from "./realtime";
import { escapeRegex } from "./search";
import { deleteSharesForItem, deleteSharesForItems } from "./shares";
import type { Board, BoardDoc, TaskDoc } from "./types";

const MAX_NAME = 40;

/** Returns the trimmed board name, or null if it is empty or too long. */
export function cleanBoardName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length === 0 || t.length > MAX_NAME ? null : t;
}

export function toBoard(d: BoardDoc): Board {
  return { id: d._id.toHexString(), name: d.name, createdAt: d.createdAt.toISOString() };
}

async function boardsCollection(): Promise<Collection<BoardDoc>> {
  return (await getDb()).collection<BoardDoc>("boards");
}

export async function listBoards(userId: string): Promise<Board[]> {
  const docs = await (await boardsCollection())
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map(toBoard);
}

/** The ids of the user's boards whose name contains the text, ignoring case. */
export async function boardIdsNamed(userId: string, text: string): Promise<ObjectId[]> {
  const docs = await (await boardsCollection()).find(
    { userId: new ObjectId(userId), name: { $regex: escapeRegex(text), $options: "i" } },
    { projection: { _id: 1 } }
  ).toArray();
  return docs.map((d) => d._id);
}

export interface BoardSummary extends Board {
  taskCount: number;
  activeCount: number;
  doneCount: number;
}

/** Boards with how many tasks each one holds (active and done). */
export async function listBoardSummaries(userId: string): Promise<BoardSummary[]> {
  const uid = new ObjectId(userId);
  const [boards, counts] = await Promise.all([
    listBoards(userId),
    (await getDb())
      .collection("tasks")
      .aggregate<{ _id: ObjectId; active: number; done: number }>([
        { $match: { userId: uid, boardId: { $ne: null } } },
        {
          $group: {
            _id: "$boardId",
            active: { $sum: { $cond: [{ $eq: ["$completed", true] }, 0, 1] } },
            done: { $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
  ]);
  const byBoard = new Map(counts.map((c) => [c._id.toHexString(), c]));
  return boards.map((b) => {
    const c = byBoard.get(b.id);
    const activeCount = c?.active ?? 0;
    const doneCount = c?.done ?? 0;
    return { ...b, taskCount: activeCount + doneCount, activeCount, doneCount };
  });
}

/** True if the board exists and belongs to this user. */
export async function boardBelongsToUser(userId: string, boardId: unknown): Promise<boolean> {
  if (typeof boardId !== "string" || !ObjectId.isValid(boardId)) return false;
  const doc = await (await boardsCollection()).findOne({ _id: new ObjectId(boardId), userId: new ObjectId(userId) });
  return doc !== null;
}

/**
 * Creates a board. If the user already has a board with the same name (ignoring case), that board is
 * returned instead, so a repeated "Create new board" does not make duplicates.
 */
export async function createBoard(userId: string, name: string): Promise<Board> {
  const col = await boardsCollection();
  const uid = new ObjectId(userId);
  const existing = await col.findOne({
    userId: uid,
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  });
  if (existing) return toBoard(existing);

  const doc: BoardDoc = { _id: new ObjectId(), userId: uid, name, createdAt: new Date() };
  await col.insertOne(doc);
  await notifyChanged(userId);
  return toBoard(doc);
}

/**
 * Renames a board. Returns "not_found" if the board does not belong to this user, and "duplicate" if another
 * board of this user already has the name (ignoring case). Renaming a board to its own name in another case is allowed.
 */
export async function renameBoard(userId: string, id: string, name: string): Promise<Board | "not_found" | "duplicate"> {
  if (!ObjectId.isValid(id)) return "not_found";
  const uid = new ObjectId(userId);
  const boardId = new ObjectId(id);
  const col = await boardsCollection();
  const board = await col.findOne({ _id: boardId, userId: uid });
  if (!board) return "not_found";

  const clash = await col.findOne({
    userId: uid,
    _id: { $ne: boardId },
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  });
  if (clash) return "duplicate";

  await col.updateOne({ _id: boardId, userId: uid }, { $set: { name } });
  await notifyChanged(userId);
  return toBoard({ ...board, name });
}

// What happens to a board's tasks when the board is removed. Done tasks are included.
export type BoardRemoval = { action: "delete" } | { action: "move"; targetId: string };

/**
 * Removes a board. Its tasks are deleted, or moved to `targetId`. The caller checks that the target is another board of this user.
 * Returns false if the board does not exist for this user.
 */
export async function removeBoard(userId: string, id: string, removal: BoardRemoval): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const uid = new ObjectId(userId);
  const boardId = new ObjectId(id);
  const boards = await boardsCollection();
  const board = await boards.findOne({ _id: boardId, userId: uid });
  if (!board) return false;

  const tasks = (await getDb()).collection<TaskDoc>("tasks");
  if (removal.action === "move") {
    await tasks.updateMany(
      { userId: uid, boardId },
      { $set: { boardId: new ObjectId(removal.targetId), updatedAt: new Date() } }
    );
  } else {
    const toDelete = await tasks.find({ userId: uid, boardId }, { projection: { _id: 1 } }).toArray();
    await tasks.deleteMany({ userId: uid, boardId });
    await deleteSharesForItems(
      "task",
      toDelete.map((t) => t._id)
    );
  }
  await boards.deleteOne({ _id: boardId, userId: uid });
  await deleteSharesForItem("board", id);
  await notifyChanged(userId);
  return true;
}
