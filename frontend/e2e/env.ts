// Shared by the Playwright config, the global setup and the tests.

// The E2E tests wipe this database before each run, so it must be a test database, never the real one.
export const MONGO_URI = process.env.E2E_MONGODB_URI ?? "";
export const DB_NAME = process.env.E2E_MONGODB_DB ?? "todo_e2e";

export const FRONT = "http://localhost:3000";
export const API = "http://localhost:3001";

// The admin account the setup creates. Only this account can add users.
export const ADMIN = { email: "admin@e2e.test", password: "e2e-admin-password" };

// Only used by the test servers.
export const AUTH_SECRET = "e2e-only-secret-that-is-at-least-32-characters-long";

/** A value that will not repeat between runs, for names, emails and titles. */
export function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
