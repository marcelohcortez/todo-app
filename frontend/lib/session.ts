import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Asks the backend whether the visitor's session cookie is valid. A signed-out visitor is sent to /login
// before anything is rendered, so the app's pages never show to them, not even for a moment.
export async function requireSignedIn(): Promise<void> {
  const backend = process.env.BACKEND_URL?.replace(/\/$/, "");
  const res = await fetch(`${backend}/api/auth/me`, {
    headers: { cookie: cookies().toString() },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/login");
}
