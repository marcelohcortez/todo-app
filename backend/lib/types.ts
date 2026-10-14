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
