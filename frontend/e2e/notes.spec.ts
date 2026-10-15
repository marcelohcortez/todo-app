import { expect, test } from "@playwright/test";
import { FRONT, ADMIN, unique } from "./env";
import { createUserAsAdmin, logIn } from "./helpers";

test("a note can be created, edited and deleted from the list", async ({ page }) => {
  await logIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/notes");

  const body = unique("Note");
  await page.getByRole("button", { name: "+ New note" }).click();
  await page.getByLabel("Note text").fill(body);
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText(body, { exact: true })).toBeVisible();

  await page.locator("li.item", { hasText: body }).getByRole("button", { name: "Edit note" }).click();
  await page.getByLabel("Note text").fill(`${body} edited`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(`${body} edited`, { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator("li.item", { hasText: `${body} edited` })
    .getByRole("button", { name: "Delete note" })
    .click();
  await expect(page.getByText(`${body} edited`, { exact: true })).toHaveCount(0);
});

test("a note is private to its owner", async ({ page, request, browser }) => {
  const memberEmail = `${unique("member")}@e2e.test`;
  const memberPassword = "member-password-1";
  await createUserAsAdmin(request, memberEmail, memberPassword);

  await logIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/notes");
  const body = unique("Private note");
  await page.getByRole("button", { name: "+ New note" }).click();
  await page.getByLabel("Note text").fill(body);
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText(body, { exact: true })).toBeVisible();

  const context = await browser.newContext({ baseURL: FRONT });
  const member = await context.newPage();
  await logIn(member, memberEmail, memberPassword);
  await member.goto("/notes");
  await expect(member.getByText("No notes yet.", { exact: false })).toBeVisible();
  await expect(member.getByText(body, { exact: true })).toHaveCount(0);
  await context.close();
});
