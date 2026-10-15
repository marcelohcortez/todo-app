import { expect, test } from "@playwright/test";
import { ADMIN } from "./env";
import { logIn } from "./helpers";

// Calls the MCP endpoint with a token, the way an AI client does. Status 200 means the token is accepted.
function listTools(request: import("@playwright/test").APIRequestContext, token: string) {
  return request.post("/api/mcp", {
    headers: { Authorization: `Bearer ${token}` },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });
}

test("each client gets its own token, and revoking one leaves the others working", async ({ page, request }) => {
  await logIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/settings");

  async function createToken(name: string): Promise<string> {
    await page.getByPlaceholder("Name, for example Claude Code").fill(name);
    await page.getByRole("button", { name: "Create token" }).click();
    await expect(page.locator("li.item", { hasText: name })).toBeVisible();
    return (await page.locator("pre.token").first().innerText()).trim();
  }

  const tokenA = await createToken("Client A");
  const tokenB = await createToken("Client B");
  expect((await listTools(request, tokenA)).status()).toBe(200);
  expect((await listTools(request, tokenB)).status()).toBe(200);

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("li.item", { hasText: "Client A" }).getByRole("button", { name: "Revoke" }).click();
  await expect(page.locator("li.item", { hasText: "Client A" })).toHaveCount(0);
  await expect(page.locator("li.item", { hasText: "Client B" })).toBeVisible();

  expect((await listTools(request, tokenA)).status()).toBe(401);
  expect((await listTools(request, tokenB)).status()).toBe(200);
});
