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
  // Null when the task has no board (tasks added before boards existed).
  boardId: string | null;
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
  boardId?: ObjectId | null;
  completed: boolean;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

// A board groups tasks, for example "Work" or "Home". The app filters tasks by board.
export interface Board {
  id: string;
  name: string;
  createdAt: string;
}

export interface BoardDoc {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  createdAt: Date;
}

// A token for an AI client. Only its hash is stored; the plain token is shown once, when it is created.
export interface McpTokenDoc {
  id: string;
  label: string;
  hash: string;
  createdAt: Date;
}

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  mcpTokens?: McpTokenDoc[];
  // The single token from before named tokens existed. Still accepted, and removable from Settings.
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
