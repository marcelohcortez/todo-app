import { createHash, randomBytes } from "crypto";
import { usersCollection } from "./users";
import { userIdForAccessToken } from "./oauth";
import { boardBelongsToUser, listBoardSummaries } from "./boards";
import {
  cleanTitle,
  createTask,
  deleteTask,
  isPriority,
  isStatusFilter,
  listTasks,
  updateTask,
} from "./tasks";
import type { TaskPatch } from "./tasks";
import { PRIORITIES } from "./types";

// ---------- token handling ----------

export function generateMcpToken(): string {
  return "tdk_" + randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Accepts a token from the Settings page (Claude Code, Claude Desktop) or an OAuth access token (claude.ai).
export async function userIdForMcpToken(token: string): Promise<string | null> {
  const user = await (await usersCollection()).findOne({ mcpTokenHash: hashToken(token) });
  if (user) return user._id.toHexString();
  return userIdForAccessToken(token);
}

// ---------- tool definitions ----------

const priorityProp = { type: "string", enum: [...PRIORITIES] };
const idProp = { type: "string", description: "Task id" };
const boardIdProp = { type: "string", description: "Board id, from list_boards" };

const TOOLS = [
  {
    name: "list_boards",
    description:
      "List boards (categories such as Work or Home) with their ids, names and task counts (active, done and total).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_tasks",
    description:
      "List tasks with priority, board, created date and completed date. Active tasks are sorted high, medium, normal. Use boardId to list one board, or boardId \"none\" for tasks without a board.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "done", "all"], default: "active" },
        boardId: { type: "string", description: "Board id from list_boards, or \"none\" for tasks without a board" },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a task. Priority defaults to normal. boardId is optional and must be an existing board.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" }, priority: priorityProp, boardId: boardIdProp },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Edit a task's title, priority and/or board. Set boardId to null to remove the task from its board.",
    inputSchema: {
      type: "object",
      properties: {
        id: idProp,
        title: { type: "string" },
        priority: priorityProp,
        boardId: { type: ["string", "null"], description: "Board id from list_boards, or null for no board" },
      },
      required: ["id"],
    },
  },
  {
    name: "set_task_completed",
    description: "Mark a task as completed (true) or not completed (false).",
    inputSchema: {
      type: "object",
      properties: { id: idProp, completed: { type: "boolean" } },
      required: ["id", "completed"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a task.",
    inputSchema: { type: "object", properties: { id: idProp }, required: ["id"] },
  },
];

// ---------- tool execution ----------

class ToolError extends Error {}

/** Checks a board id from a tool call. Returns null for "no board" (or for a missing value when allowed). */
async function checkBoard(userId: string, value: unknown): Promise<string | null> {
  if (value === null) return null;
  if (!(await boardBelongsToUser(userId, value))) throw new ToolError("board not found (see list_boards)");
  return value as string;
}

async function callTool(userId: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_boards":
      return listBoardSummaries(userId);

    case "list_tasks": {
      const status = args.status ?? "active";
      if (!isStatusFilter(status)) throw new ToolError("status must be active, done or all");
      let boardId: string | null | undefined;
      if (args.boardId === "none") boardId = null;
      else if (args.boardId !== undefined) boardId = await checkBoard(userId, args.boardId);
      return listTasks(userId, status, boardId);
    }

    case "create_task": {
      const title = cleanTitle(args.title);
      if (!title) throw new ToolError("title is required (max 500 characters)");
      const priority = args.priority ?? "normal";
      if (!isPriority(priority)) throw new ToolError("priority must be high, medium or normal");
      const boardId = args.boardId === undefined ? null : await checkBoard(userId, args.boardId);
      return createTask(userId, title, priority, boardId);
    }

    case "update_task": {
      if (typeof args.id !== "string") throw new ToolError("id is required");
      const patch: TaskPatch = {};
      if (args.title !== undefined) {
        const title = cleanTitle(args.title);
        if (!title) throw new ToolError("title must be non-empty (max 500 characters)");
        patch.title = title;
      }
      if (args.priority !== undefined) {
        const priority = args.priority;
        if (!isPriority(priority)) throw new ToolError("priority must be high, medium or normal");
        patch.priority = priority;
      }
      if (args.boardId !== undefined) patch.boardId = await checkBoard(userId, args.boardId);
      const task = await updateTask(userId, args.id, patch);
      if (!task) throw new ToolError("task not found");
      return task;
    }

    case "set_task_completed": {
      if (typeof args.id !== "string") throw new ToolError("id is required");
      if (typeof args.completed !== "boolean") throw new ToolError("completed must be true or false");
      const task = await updateTask(userId, args.id, { completed: args.completed });
      if (!task) throw new ToolError("task not found");
      return task;
    }

    case "delete_task": {
      if (typeof args.id !== "string") throw new ToolError("id is required");
      const ok = await deleteTask(userId, args.id);
      if (!ok) throw new ToolError("task not found");
      return { deleted: true, id: args.id };
    }

    default:
      throw new ToolError(`unknown tool: ${name}`);
  }
}

// ---------- JSON-RPC 2.0 dispatch ----------

interface RpcMessage {
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
}

/** Returns the JSON-RPC response, or null when no response is due (notifications). */
export async function handleMessage(raw: unknown, userId: string): Promise<unknown | null> {
  const msg = (typeof raw === "object" && raw !== null ? raw : {}) as RpcMessage;
  const id = msg.id ?? null;
  const isNotification = msg.id === undefined;

  try {
    switch (msg.method) {
      case "initialize":
        return rpcResult(id, {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "keeptrack", version: "1.0.0" },
        });

      case "notifications/initialized":
        return null;

      case "ping":
        return rpcResult(id, {});

      case "tools/list":
        return rpcResult(id, { tools: TOOLS });

      case "tools/call": {
        const name = msg.params?.name;
        if (typeof name !== "string") return rpcError(id, -32602, "Missing tool name");
        try {
          const out = await callTool(userId, name, msg.params?.arguments ?? {});
          return rpcResult(id, {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
          });
        } catch (err) {
          if (err instanceof ToolError) {
            return rpcResult(id, { content: [{ type: "text", text: err.message }], isError: true });
          }
          throw err;
        }
      }

      default:
        if (isNotification) return null;
        return rpcError(id, -32601, `Method not found: ${String(msg.method)}`);
    }
  } catch {
    if (isNotification) return null;
    return rpcError(id, -32603, "Internal error");
  }
}

function rpcResult(id: RpcMessage["id"], result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: RpcMessage["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
