import { ObjectId } from "mongodb";
import type { Collection, Filter } from "mongodb";
import { getDb } from "./mongodb";
import { PAGE_SIZE, pageOf } from "./pagination";
import { escapeRegex } from "./search";
import { notifyChanged } from "./realtime";
import { deleteSharesForItem, notifyAccess, resolveNoteAccess, withOwnerFallback } from "./shares";
import type { Note, NoteDeletionDoc, NoteDoc } from "./types";

// Tombstones older than this are dropped. A vault that has not synced for this long rebuilds from scratch.
const TOMBSTONE_DAYS = 90;
const MAX_BODY = 20000;

/** Returns the trimmed body, or null if it is empty or too long. */
export function cleanBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length === 0 || t.length > MAX_BODY ? null : t;
}

export function toNote(d: NoteDoc): Note {
  return {
    id: d._id.toHexString(),
    body: d.body,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

let indexReady = false;

async function notesCollection(): Promise<Collection<NoteDoc>> {
  const col = (await getDb()).collection<NoteDoc>("notes");
  if (!indexReady) {
    // The list page (newest first) and changesSince (filtered by updatedAt) are the two query shapes.
    await col.createIndex({ userId: 1, createdAt: -1 });
    await col.createIndex({ userId: 1, updatedAt: 1 });
    indexReady = true;
  }
  return col;
}

let deletionsIndexReady = false;

async function deletionsCollection(): Promise<Collection<NoteDeletionDoc>> {
  const col = (await getDb()).collection<NoteDeletionDoc>("note_deletions");
  if (!deletionsIndexReady) {
    await col.createIndex({ userId: 1, deletedAt: 1 });
    deletionsIndexReady = true;
  }
  return col;
}

export interface NotePage {
  notes: Note[];
  total: number;
  page: number;
  pageCount: number;
}

/** One page of notes, newest first, PAGE_SIZE each. The id is a tie-breaker, so pages never overlap. */
/** `query` keeps only the notes whose text contains it, ignoring case. */
export async function listNotes(userId: string, requestedPage: number, query?: string): Promise<NotePage> {
  const filter: Filter<NoteDoc> = { userId: new ObjectId(userId) };
  if (query) filter.body = { $regex: escapeRegex(query), $options: "i" };
  const col = await notesCollection();
  const total = await col.countDocuments(filter);
  const { page, pageCount, skip } = pageOf(total, requestedPage);
  const docs = await col
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .toArray();
  return { notes: docs.map(toNote), total, page, pageCount };
}

// `userId` may be the owner or a friend the note is shared with.
export async function getNote(userId: string, id: string): Promise<Note | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await notesCollection();
  let doc = await col.findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  if (!doc) {
    const access = await resolveNoteAccess(userId, id);
    if (!access) return null;
    doc = await col.findOne({ _id: new ObjectId(id), userId: new ObjectId(access.ownerId) });
  }
  return doc ? toNote(doc) : null;
}

export async function createNote(userId: string, body: string): Promise<Note> {
  const now = new Date();
  const doc: NoteDoc = { _id: new ObjectId(), userId: new ObjectId(userId), body, createdAt: now, updatedAt: now };
  await (await notesCollection()).insertOne(doc);
  await notifyChanged(userId);
  return toNote(doc);
}

export async function updateNote(userId: string, id: string, body: string): Promise<Note | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await notesCollection();
  const now = new Date();

  const result = await withOwnerFallback(userId, id, resolveNoteAccess, (ownerId) =>
    col.findOneAndUpdate(
      { _id: new ObjectId(id), userId: new ObjectId(ownerId) },
      { $set: { body, updatedAt: now } },
      { returnDocument: "after" }
    )
  );
  if (!result) return null;

  await notifyAccess(result.ownerId, { noteId: id });
  return toNote(result.value);
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await notesCollection();

  const result = await withOwnerFallback(userId, id, resolveNoteAccess, (ownerId) =>
    col.findOneAndDelete({ _id: new ObjectId(id), userId: new ObjectId(ownerId) })
  );
  if (!result) return false;

  await (await deletionsCollection()).insertOne({
    _id: new ObjectId(),
    userId: new ObjectId(result.ownerId),
    noteId: id,
    deletedAt: new Date(),
  });
  await deleteSharesForItem("note", id);
  await notifyAccess(result.ownerId, { noteId: id });
  return true;
}

/**
 * Notes added or edited since `since` (all notes when `since` is null), plus the ids deleted since then.
 * `serverTime` is taken before the queries, so the next call starts from it and misses nothing.
 */
export async function changesSince(
  userId: string,
  since: Date | null
): Promise<{ notes: Note[]; deleted: string[]; serverTime: string }> {
  const serverTime = new Date();
  const uid = new ObjectId(userId);
  const purgeBefore = new Date(Date.now() - TOMBSTONE_DAYS * 24 * 60 * 60 * 1000);
  await (await deletionsCollection()).deleteMany({ userId: uid, deletedAt: { $lt: purgeBefore } });

  const noteFilter: Filter<NoteDoc> = { userId: uid };
  const deletionFilter: Filter<NoteDeletionDoc> = { userId: uid };
  if (since) {
    noteFilter.updatedAt = { $gte: since };
    deletionFilter.deletedAt = { $gte: since };
  }

  const [docs, deletions] = await Promise.all([
    (await notesCollection()).find(noteFilter).sort({ createdAt: 1 }).toArray(),
    since ? (await deletionsCollection()).find(deletionFilter).toArray() : Promise.resolve([]),
  ]);
  return {
    notes: docs.map(toNote),
    deleted: deletions.map((d) => d.noteId),
    serverTime: serverTime.toISOString(),
  };
}
