import { expect, test } from "@playwright/test";
import { FRONT, ADMIN, unique } from "./env";
import { addTask, createBoard, createUserAsAdmin, logIn } from "./helpers";

test("opening + New board closes the add-task form, and the board's Cancel sits in its place", async ({ page }) => {
  await logIn(page, ADMIN.email, ADMIN.password);

  await page.getByRole("button", { name: "+ New task" }).click();
  await expect(page.getByPlaceholder("What needs doing?")).toBeVisible();

  await page.getByRole("button", { name: "+ New board" }).click();
  await expect(page.getByPlaceholder("What needs doing?")).toHaveCount(0);
  await expect(page.getByPlaceholder("Name of the new board")).toBeVisible();

  const boardBar = page.locator(".board-bar");
  await expect(boardBar.getByRole("button", { name: "Cancel" })).toBeVisible();
  await boardBar.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByPlaceholder("Name of the new board")).toHaveCount(0);
  await expect(boardBar.getByRole("button", { name: "+ New board" })).toBeVisible();
});

test("a task is added and shows in the list", async ({ page }) => {
  await logIn(page, ADMIN.email, ADMIN.password);
  const board = unique("Board");
  await createBoard(page, board);
  const title = unique("Task");
  await addTask(page, title, board);

  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("a task belongs to its owner and other users do not see it", async ({ page, request, browser }) => {
  const memberEmail = `${unique("member")}@e2e.test`;
  const memberPassword = "member-password-1";
  await createUserAsAdmin(request, memberEmail, memberPassword);

  await logIn(page, ADMIN.email, ADMIN.password);
  const board = unique("Board");
  await createBoard(page, board);
  const title = unique("Admin only");
  await addTask(page, title, board);
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  const context = await browser.newContext({ baseURL: FRONT });
  const member = await context.newPage();
  await logIn(member, memberEmail, memberPassword);
  await expect(member.getByText("Nothing to do. Add a task above.")).toBeVisible();
  await expect(member.getByText(title, { exact: true })).toHaveCount(0);
  await context.close();
});
