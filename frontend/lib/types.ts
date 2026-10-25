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

// Shape returned by the backend API. A board groups tasks, for example "Work".
export interface Board {
  id: string;
  name: string;
  createdAt: string;
  taskCount: number;
  activeCount: number;
  doneCount: number;
}

// Shape returned by the backend API.
export interface Task {
  id: string;
  title: string;
  priority: Priority;
  // Null for tasks without a board.
  boardId: string | null;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

// One friend, or one pending request, from GET /api/friends.
export interface Friend {
  friendshipId: string;
  userId: string;
  email: string;
  createdAt: string;
}

export interface FriendState {
  friends: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
}

export type ShareKind = "board" | "task" | "note";

export interface AppNotification {
  id: string;
  type: "friend_request" | "friend_accepted" | "share";
  data: { fromUserId?: string; fromEmail?: string; kind?: ShareKind; itemId?: string };
  createdAt: string;
  read: boolean;
}

// One board, task, or note shared with the caller, from GET /api/shared/with-me/*.
export interface SharedBoard extends Board {
  ownerEmail: string;
}

export interface SharedTask extends Task {
  ownerEmail: string;
}

export interface SharedNote extends Note {
  ownerEmail: string;
}

// One item the caller has shared out, from GET /api/shared/by-me.
export interface SharedByMeEntry {
  shareId: string;
  kind: ShareKind;
  itemId: string;
  name: string;
  friendEmail: string;
  createdAt: string;
}
