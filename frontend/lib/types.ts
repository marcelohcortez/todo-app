// Shared with the browser, so this file must not import server code (MongoDB, bcrypt, jose).
// Keep in sync with backend/lib/types.ts.
export const PRIORITIES = ["high", "medium", "normal"] as const;
export type Priority = (typeof PRIORITIES)[number];

// Shape returned by the backend API for notes. A note has no title and no priority.
export interface Note {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// Shape returned by the backend API.
export interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}
