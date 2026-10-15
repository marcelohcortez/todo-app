import { expect, test } from "@playwright/test";
import { FRONT, ADMIN, unique } from "./env";
import { logIn } from "./helpers";

test("the admin opens Add user from Options and sees the existing accounts", async ({ page }) => {
  await logIn(page, ADMIN.email, ADMIN.password);

  await page.getByRole("button", { name: "Options" }).click();
  await page.getByRole("menuitem", { name: "Add user" }).click();

  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByText(ADMIN.email, { exact: true })).toBeVisible();
  await expect(page.getByText("Admin", { exact: true })).toBeVisible();
});

test("the admin adds a user, who can log in but cannot add users", async ({ page, browser }) => {
  await logIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/users");

  const email = `${unique("new-user")}@e2e.test`;
  const password = "new-user-password";
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8 characters or more)").fill(password);
  await page.getByRole("button", { name: "Add user" }).click();

  await expect(page.getByText(`${email} can now log in.`)).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  const context = await browser.newContext({ baseURL: FRONT });
  const member = await context.newPage();
  await logIn(member, email, password);

  await member.getByRole("button", { name: "Options" }).click();
  await expect(member.getByRole("menuitem", { name: "Log out" })).toBeVisible();
  await expect(member.getByRole("menuitem", { name: "Add user" })).toHaveCount(0);

  await member.goto("/users");
  await expect(member.getByText("Only the admin can add users.")).toBeVisible();
  await expect(member.getByPlaceholder("Email")).toHaveCount(0);
  await context.close();
});
