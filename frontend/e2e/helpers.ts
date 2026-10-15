import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { ADMIN } from "./env";

export async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/");
}

/** Creates an account the way the admin does, through the API. The request context ends up signed in as the admin. */
export async function createUserAsAdmin(request: APIRequestContext, email: string, password: string) {
  const login = await request.post("/api/auth/login", { data: { email: ADMIN.email, password: ADMIN.password } });
  expect(login.ok()).toBe(true);
  const res = await request.post("/api/users", { data: { email, password } });
  expect(res.status()).toBe(201);
}

/** Creates a board with the "+ New board" form on the task page. */
export async function createBoard(page: Page, name: string) {
  await page.getByRole("button", { name: "+ New board" }).click();
  await page.getByPlaceholder("Name of the new board").fill(name);
  await page.getByRole("button", { name: "Create board" }).click();
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
}

/** Adds a task to a board. A task must have a board, so the board is created first if needed. */
export async function addTask(page: Page, title: string, board: string) {
  await page.getByRole("button", { name: "+ New task" }).click();
  await page.getByPlaceholder("What needs doing?").fill(title);
  await page.getByLabel("Board", { exact: true }).selectOption({ label: board });
  await page.getByRole("button", { name: "Add", exact: true }).click();
}
