import type { ObjectId } from "mongodb";

export const PRIORITIES = ["high", "medium", "normal"] as const;
export type Priority = (typeof PRIORITIES)[number];

// Lower number = shown first.
export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, normal: 2 };

// Shape sent to the browser and to MCP clients.
export interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

// Shape stored in MongoDB.
export interface TaskDoc {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  mcpTokenHash?: string;
  createdAt: Date;
}

// A note has no title and no priority. Its body is the text, typed or transcribed by voice.
export interface Note {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDoc {
  _id: ObjectId;
  userId: ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

// Written when a note is deleted. Holds no note content, only what the vault needs to remove it.
export interface NoteDeletionDoc {
  _id: ObjectId;
  userId: ObjectId;
  noteId: string;
  deletedAt: Date;
}
