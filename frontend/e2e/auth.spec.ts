import { expect, test } from "@playwright/test";
import { ADMIN } from "./env";
import { logIn } from "./helpers";

test("the login page has no public sign-up", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expect(page.getByText("Create one")).toHaveCount(0);
});

test("a wrong password shows an error and does not log in", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN.email);
  await page.getByPlaceholder("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/notes");
  await expect(page).toHaveURL(/\/login/);
});

test("the logo goes back to the home page", async ({ page }) => {
  await logIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/notes");
  await page.getByRole("link", { name: "Keeptrack home" }).click();
  await expect(page).toHaveURL("/");
});
