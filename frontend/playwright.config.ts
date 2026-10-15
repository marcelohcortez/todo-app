import { defineConfig, devices } from "@playwright/test";
import { API, AUTH_SECRET, DB_NAME, FRONT, MONGO_URI, ADMIN } from "./e2e/env";

if (!MONGO_URI) {
  throw new Error(
    "Set E2E_MONGODB_URI to a MongoDB server the tests can use. They wipe the database named by E2E_MONGODB_DB (default todo_e2e)."
  );
}
if (!DB_NAME.includes("e2e")) {
  throw new Error(`E2E_MONGODB_DB must contain "e2e" so that real data is never wiped (got "${DB_NAME}").`);
}

// Starts the backend and the frontend itself, with a test database and a known admin account.
// Pusher is switched off, so the tests do not send live updates to a real channel.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: FRONT,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /\.phone\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "phone",
      testMatch: /\.phone\.spec\.ts$/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- -p 3001",
      cwd: "../backend",
      port: 3001,
      reuseExistingServer: false,
      env: {
        ...process.env,
        MONGODB_URI: MONGO_URI,
        MONGODB_DB: DB_NAME,
        AUTH_SECRET,
        ADMIN_EMAIL: ADMIN.email,
        PUSHER_APP_ID: "",
        PUSHER_KEY: "",
        PUSHER_SECRET: "",
        PUSHER_CLUSTER: "",
      } as Record<string, string>,
    },
    {
      command: "npm run dev -- -p 3000",
      port: 3000,
      reuseExistingServer: false,
      env: { ...process.env, BACKEND_URL: API } as Record<string, string>,
    },
  ],
});
