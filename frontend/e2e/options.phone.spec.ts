import { expect, test } from "@playwright/test";
import { ADMIN } from "./env";
import { logIn } from "./helpers";

test("on a phone, Options opens a sheet with Settings, Add user and Log out", async ({ page }) => {
  await logIn(page, ADMIN.email, ADMIN.password);

  await page.getByRole("button", { name: "Options" }).click();
  const sheet = page.getByRole("dialog", { name: "Options" });
  await expect(sheet.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Add user" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Log out" })).toBeVisible();
});
